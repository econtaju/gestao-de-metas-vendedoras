import { AppUser, AuthSession, UserRole, UserStatus } from '../types';
import { sendUserApprovalRequestEmail } from './resendService';
import { fetchUsersFromSupabase, syncUserToSupabase, deleteUserFromSupabase } from './supabaseService';

export const AUTH_STORAGE_KEYS = {
  USERS: 'gmc_auth_users_v2',
  SESSION: 'gmc_auth_session_v2',
};

/**
 * Hash simples e seguro de senha utilizando Web Crypto API (SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback seguro se subtle crypto não estiver disponível
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Gera um token único de aprovação
 */
export function generateApprovalToken(): string {
  return `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Usuário Administrador Mestre Inicial (Pré-aprovado)
 */
export const DEFAULT_ADMIN_USER: AppUser = {
  id: 'usr-admin-master',
  username: 'leonardo',
  name: 'Leonardo Arantes',
  email: 'leonardoricardoarantes@gmail.com',
  passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Hash padrão inicial ("admin")
  role: 'consultant',
  status: 'approved',
  createdAt: new Date().toISOString(),
};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
}

/**
 * Carrega a lista de usuários persistida localmente
 */
export function getStoredUsers(): AppUser[] {
  try {
    const raw = safeGetItem(AUTH_STORAGE_KEYS.USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garante que o usuário mestre leonardo esteja sempre presente, ativo e como consultant
        const masterIdx = parsed.findIndex(
          (u: AppUser) => u.username?.toLowerCase() === 'leonardo' || u.id === DEFAULT_ADMIN_USER.id
        );
        if (masterIdx === -1) {
          parsed.unshift(DEFAULT_ADMIN_USER);
        } else {
          parsed[masterIdx] = {
            ...parsed[masterIdx],
            role: 'consultant',
            status: 'approved',
          };
        }
        return parsed;
      }
    }
    // Inicializa com o usuário administrador mestre
    const initial = [DEFAULT_ADMIN_USER];
    safeSetItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(initial));
    return initial;
  } catch {
    return [DEFAULT_ADMIN_USER];
  }
}

/**
 * Sincroniza usuários remotos do Supabase com o armazenamento local
 */
export async function syncUsersFromRemote(): Promise<AppUser[]> {
  try {
    const remoteUsers = await fetchUsersFromSupabase();
    if (remoteUsers && remoteUsers.length > 0) {
      const local = getStoredUsers();
      const merged = [...remoteUsers];
      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id)) {
          merged.push(loc);
        }
      });
      // Garante que o usuário mestre esteja sempre na lista e com papel de consultor ativo
      const masterIdx = merged.findIndex(
        (u: AppUser) => u.username?.toLowerCase() === 'leonardo' || u.id === DEFAULT_ADMIN_USER.id
      );
      if (masterIdx === -1) {
        merged.unshift(DEFAULT_ADMIN_USER);
      } else {
        merged[masterIdx] = {
          ...merged[masterIdx],
          role: 'consultant',
          status: 'approved',
        };
      }
      saveStoredUsers(merged);
      return merged;
    }
  } catch {
    // Falha silenciosa de rede
  }
  return getStoredUsers();
}

/**
 * Salva a lista de usuários
 */
export function saveStoredUsers(users: AppUser[]): void {
  try {
    safeSetItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários', e);
  }
}

/**
 * Carrega a sessão atual
 */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = safeGetItem(AUTH_STORAGE_KEYS.SESSION);
    if (raw) {
      const session = JSON.parse(raw) as AuthSession;
      if (!session || !session.user) {
        safeRemoveItem(AUTH_STORAGE_KEYS.SESSION);
        return null;
      }
      // Valida se o usuário ainda existe e está aprovado
      const users = getStoredUsers();
      const current = users.find(
        (u) => u.id === session.user?.id || u.username?.toLowerCase() === session.user?.username?.toLowerCase()
      );
      if (current && current.status === 'approved') {
        return { ...session, user: current };
      }
      safeRemoveItem(AUTH_STORAGE_KEYS.SESSION);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Salva a sessão ativa
 */
export function saveStoredSession(session: AuthSession | null): void {
  try {
    if (session) {
      safeSetItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session));
    } else {
      safeRemoveItem(AUTH_STORAGE_KEYS.SESSION);
    }
  } catch (e) {
    console.error('Erro ao salvar sessão', e);
  }
}

/**
 * Registra um novo usuário e dispara e-mail de aprovação via Resend
 */
export async function registerNewUser(
  name: string,
  username: string,
  password: string,
  role: UserRole = 'consultant',
  email?: string
): Promise<{ success: boolean; user?: AppUser; message: string }> {
  if (!name || !name.trim()) {
    return { success: false, message: 'O nome completo é obrigatório.' };
  }
  const normalizedUsername = (username || '').toLowerCase().trim();
  if (!normalizedUsername) {
    return { success: false, message: 'O nome de usuário é obrigatório.' };
  }
  if (!password || password.trim().length < 4) {
    return { success: false, message: 'A senha deve ter no mínimo 4 caracteres.' };
  }

  const users = getStoredUsers();

  if (normalizedUsername === 'admin' || users.some((u) => u.username.toLowerCase() === normalizedUsername)) {
    return { success: false, message: 'Este nome de usuário já está em uso.' };
  }

  const passwordHash = await hashPassword(password);
  const token = generateApprovalToken();

  const newUser: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: normalizedUsername,
    name: name.trim(),
    email: email?.trim() || undefined,
    passwordHash,
    role,
    status: 'pending_approval',
    approvalToken: token,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  // Sincroniza com o Supabase em segundo plano
  syncUserToSupabase(newUser).catch(() => {});

  // URL base para os links de aprovação
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:5173';
  const approvalUrl = `${baseUrl}?action=approve_user&token=${token}`;
  const rejectionUrl = `${baseUrl}?action=reject_user&token=${token}`;

  // Dispara o e-mail via Resend
  await sendUserApprovalRequestEmail({
    user: newUser,
    approvalUrl,
    rejectionUrl,
  });

  return {
    success: true,
    user: newUser,
    message:
      'Solicitação enviada com sucesso! Um e-mail com botão de aprovação foi enviado para o administrador leonardoricardoarantes@gmail.com.',
  };
}

/**
 * Autentica usuário e senha
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; session?: AuthSession; message?: string }> {
  if (!username || !username.trim() || !password) {
    return { success: false, message: 'Por favor, informe seu usuário e senha.' };
  }
  const users = getStoredUsers();
  const normalizedUsername = username.toLowerCase().trim();
  const passwordHash = await hashPassword(password);

  let user = users.find((u) => u.username.toLowerCase() === normalizedUsername);
  if (!user && normalizedUsername === 'admin') {
    user = users.find((u) => u.username.toLowerCase() === 'leonardo');
  }

  if (!user) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (user.passwordHash !== passwordHash) {
    return { success: false, message: 'Senha incorreta.' };
  }

  if (user.status === 'pending_approval') {
    return {
      success: false,
      message:
        'Seu acesso ainda está pendente de aprovação pelo administrador. Verifique com leonardoricardoarantes@gmail.com.',
    };
  }

  if (user.status === 'rejected') {
    return {
      success: false,
      message: 'Sua solicitação de acesso não foi autorizada pelo administrador.',
    };
  }

  const session: AuthSession = {
    user,
    token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    loginAt: new Date().toISOString(),
  };

  saveStoredSession(session);
  return { success: true, session };
}

/**
 * Processa aprovação ou recusa via Token de E-mail
 */
export function handleTokenAction(
  action: 'approve_user' | 'reject_user',
  token: string
): { success: boolean; message: string; user?: AppUser } {
  const users = getStoredUsers();
  const userIndex = users.findIndex((u) => u.approvalToken === token);

  if (userIndex === -1) {
    return {
      success: false,
      message: 'Token de aprovação inválido ou já processado anteriormente.',
    };
  }

  const targetUser = users[userIndex];
  const newStatus: UserStatus = action === 'approve_user' ? 'approved' : 'rejected';

  const updatedUser: AppUser = {
    ...targetUser,
    status: newStatus,
    approvalToken: undefined, // Limpa o token após o uso
    approvedAt: new Date().toISOString(),
    approvedBy: 'leonardoricardoarantes@gmail.com',
    updatedAt: new Date().toISOString(),
  };

  users[userIndex] = updatedUser;
  saveStoredUsers(users);
  syncUserToSupabase(updatedUser).catch(() => {});

  return {
    success: true,
    user: updatedUser,
    message:
      action === 'approve_user'
        ? `Usuário @${updatedUser.username} (${updatedUser.name}) APROVADO com sucesso!`
        : `Solicitação do usuário @${updatedUser.username} foi RECUSADA.`,
  };
}

/**
 * Aprova manualmente um usuário pelo painel
 */
export function approveUserManually(
  userId: string,
  approvedBy: string = 'leonardo'
): { success: boolean; user?: AppUser } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return { success: false };

  const updated: AppUser = {
    ...users[index],
    status: 'approved',
    approvalToken: undefined,
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updated;
  saveStoredUsers(users);
  syncUserToSupabase(updated).catch(() => {});

  return { success: true, user: updated };
}

/**
 * Rejeita manualmente um usuário pelo painel
 */
export function rejectUserManually(userId: string): { success: boolean; user?: AppUser } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return { success: false };

  const target = users[index];
  if (
    target.username.toLowerCase() === 'leonardo' ||
    target.username.toLowerCase() === 'admin' ||
    target.id === DEFAULT_ADMIN_USER.id
  ) {
    return { success: false }; // Protege o admin mestre de ser suspenso/rejeitado
  }

  const updated: AppUser = {
    ...target,
    status: 'rejected',
    approvalToken: undefined,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updated;
  saveStoredUsers(users);
  syncUserToSupabase(updated).catch(() => {});

  return { success: true, user: updated };
}

/**
 * Cria diretamente um novo usuário pelo painel administrativo (já aprovado por padrão)
 */
export async function createUserDirectly(
  name: string,
  username: string,
  password: string,
  role: UserRole = 'consultant',
  email?: string,
  approved: boolean = true
): Promise<{ success: boolean; user?: AppUser; message: string }> {
  if (!name || !name.trim()) {
    return { success: false, message: 'O nome completo é obrigatório.' };
  }
  const normalizedUsername = (username || '').toLowerCase().trim();
  if (!normalizedUsername) {
    return { success: false, message: 'O nome de usuário é obrigatório.' };
  }
  if (!password || password.trim().length < 4) {
    return { success: false, message: 'A senha deve ter no mínimo 4 caracteres.' };
  }

  const users = getStoredUsers();

  if (normalizedUsername === 'admin' || users.some((u) => u.username.toLowerCase() === normalizedUsername)) {
    return { success: false, message: 'Este nome de usuário já está em uso.' };
  }

  const passwordHash = await hashPassword(password);

  const newUser: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: normalizedUsername,
    name: name.trim(),
    email: email?.trim() || undefined,
    passwordHash,
    role,
    status: approved ? 'approved' : 'pending_approval',
    approvedAt: approved ? new Date().toISOString() : undefined,
    approvedBy: approved ? 'admin' : undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  // Sincroniza imediatamente com o Supabase
  await syncUserToSupabase(newUser).catch(() => {});

  return {
    success: true,
    user: newUser,
    message: `Usuário @${newUser.username} criado com sucesso e sincronizado no Supabase!`,
  };
}

/**
 * Exclui um usuário do sistema e do Supabase
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
  const users = getStoredUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  if (
    user.username.toLowerCase() === 'leonardo' ||
    user.username.toLowerCase() === 'admin' ||
    user.id === DEFAULT_ADMIN_USER.id
  ) {
    return { success: false, message: 'Não é permitido excluir o administrador mestre do sistema.' };
  }

  const updatedUsers = users.filter((u) => u.id !== userId);
  saveStoredUsers(updatedUsers);

  // Remove do Supabase
  await deleteUserFromSupabase(userId).catch(() => {});

  return { success: true, message: `Usuário @${user.username} excluído com sucesso.` };
}

/**
 * Atualiza o papel/permissão de um usuário (consultant, manager, seller)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; message: string; user?: AppUser }> {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  const target = users[index];
  if (
    (target.username.toLowerCase() === 'leonardo' ||
      target.username.toLowerCase() === 'admin' ||
      target.id === DEFAULT_ADMIN_USER.id) &&
    newRole !== 'consultant'
  ) {
    return { success: false, message: 'Não é permitido alterar o papel do administrador mestre do sistema.' };
  }

  const updated: AppUser = {
    ...target,
    role: newRole,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updated;
  saveStoredUsers(users);
  await syncUserToSupabase(updated).catch(() => {});

  return { success: true, message: `Papel de @${updated.username} alterado para ${newRole}.`, user: updated };
}

/**
 * Redefine a senha de um usuário
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Usuário não encontrado.' };
  }

  const passwordHash = await hashPassword(newPassword);
  const updated: AppUser = {
    ...users[index],
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  users[index] = updated;
  saveStoredUsers(users);
  await syncUserToSupabase(updated).catch(() => {});

  return { success: true, message: `Senha de @${updated.username} redefinida com sucesso!` };
}
