import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Mail,
  Trash2,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  UserPlus,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getStoredUsers,
  getStoredSession,
  approveUserManually,
  rejectUserManually,
  createUserDirectly,
  deleteUser,
  updateUserRole,
  resetUserPassword,
} from '../../services/authService';
import { AppUser, UserRole } from '../../types';

interface UserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
}

export const UserApprovalModal: React.FC<UserApprovalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { logout, setAuthSession } = useApp();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [message, setMessage] = useState<string | null>(null);

  // Form states - Criar Usuário
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('consultant');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadUsers = () => {
    setUsersList(getStoredUsers());
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen || currentUser.role !== 'consultant') return null;

  const handleApprove = (id: string, name: string) => {
    const res = approveUserManually(id, currentUser.username);
    if (res.success) {
      loadUsers();
      setMessage(`Usuário ${name} aprovado com sucesso!`);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReject = (id: string, name: string) => {
    const res = rejectUserManually(id);
    if (res.success) {
      loadUsers();
      setMessage(`Solicitação de ${name} recusada.`);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir permanentemente o usuário @${username}?`)) {
      const res = await deleteUser(id);
      if (res.success) {
        loadUsers();
        if (currentUser?.id === id) {
          onClose();
          logout();
          return;
        }
        setMessage(`Usuário @${username} excluído com sucesso.`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(res.message);
      }
    }
  };

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    const res = await updateUserRole(id, newRole);
    if (res.success) {
      loadUsers();
      if (currentUser?.id === id) {
        const storedSession = getStoredSession();
        if (storedSession) {
          setAuthSession(storedSession);
        }
      }
      setMessage(res.message);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleResetPass = async (id: string, username: string) => {
    const newPass = window.prompt(`Informe a nova senha para o usuário @${username}:`);
    if (newPass) {
      const res = await resetUserPassword(id, newPass);
      if (res.success) {
        loadUsers();
        setMessage(res.message);
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert(res.message);
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword) {
      setCreateError('Preencha os campos obrigatórios (Nome, Usuário e Senha).');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await createUserDirectly(
        newName,
        newUsername,
        newPassword,
        newRole,
        newEmail,
        true // Já cria com status approved
      );

      if (res.success) {
        loadUsers();
        setMessage(`Usuário @${newUsername} criado com sucesso e já ativado!`);
        setNewName('');
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setActiveTab('list');
        setTimeout(() => setMessage(null), 4000);
      } else {
        setCreateError(res.message);
      }
    } catch {
      setCreateError('Erro ao criar usuário.');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (filter === 'pending') return u.status === 'pending_approval';
    if (filter === 'approved') return u.status === 'approved';
    return true;
  });

  const pendingCount = usersList.filter((u) => u.status === 'pending_approval').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-400/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Painel de Gestão & Criação de Usuários</h2>
              <p className="text-xs text-slate-300">
                Aprove solicitações de acesso ou cadastre novos usuários diretamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition ${
                activeTab === 'list'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Usuários & Aprovações ({usersList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setCreateError(null);
              }}
              className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Novo Usuário
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              type="button"
              onClick={loadUsers}
              className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 pb-2 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          )}
        </div>

        {message && (
          <div className="m-4 mb-0 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* TAB 1: LISTA & APROVAÇÕES */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Todos ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  filter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                Pendentes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('approved')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Aprovados ({usersList.filter((u) => u.status === 'approved').length})
              </button>
            </div>

            {/* Users List */}
            <div className="p-4 overflow-y-auto flex-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Nenhum usuário encontrado neste filtro.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map((user) => {
                    const isPending = user.status === 'pending_approval';
                    const isApproved = user.status === 'approved';
                    const isRejected = user.status === 'rejected';

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          isPending
                            ? 'bg-amber-50/60 border-amber-200'
                            : isApproved
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{user.name}</span>
                            <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                              @{user.username}
                            </span>
                            {isPending && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                Aguardando Aprovação
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Aprovado
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                Recusado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                            {user.email && <span>E-mail: {user.email}</span>}
                            <div className="flex items-center gap-1">
                              <span>Papel:</span>
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                disabled={user.username.toLowerCase() === 'leonardo' || user.username.toLowerCase() === 'admin'}
                                className="bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-800 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="consultant">Consultor</option>
                                <option value="manager">Gestor</option>
                                <option value="seller">Vendedor</option>
                              </select>
                            </div>
                            <span>Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(user.id, user.name)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(user.id, user.name)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Recusar
                              </button>
                            </>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleApprove(user.id, user.name)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Reativar / Aprovar
                            </button>
                          )}

                          {isApproved && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResetPass(user.id, user.username)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                title="Redefinir Senha"
                              >
                                <KeyRound className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">Senha</span>
                              </button>

                              {user.username.toLowerCase() !== 'leonardo' && user.username.toLowerCase() !== 'admin' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(user.id, user.name)}
                                    className="px-2 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                                    title="Suspender Acesso"
                                  >
                                    Suspender
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(user.id, user.username)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CRIAR NOVO USUÁRIO DIRETAMENTE */}
        {activeTab === 'create' && (
          <div className="p-6 overflow-y-auto flex-1">
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-lg mx-auto text-xs">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Usuários criados diretamente por aqui já nascem <strong>aprovados e sincronizados no Supabase</strong>, podendo acessar o sistema imediatamente.
                </span>
              </div>

              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
                  {createError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Oliveira"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome de Usuário (Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: carlos.vendas"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="Senha de acesso"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="carlos@empresa.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Papel / Nível de Acesso</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="consultant">Consultor FP&A (Acesso Completo)</option>
                    <option value="manager">Gerente de Unidade</option>
                    <option value="seller">Vendedor / Comercial</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Criar e Ativar Usuário</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            E-mail de avisos configurado: <strong>leonardoricardoarantes@gmail.com</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
