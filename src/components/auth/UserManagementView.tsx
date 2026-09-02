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
  LogOut,
  Database,
  Lock,
  User,
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

export const UserManagementView: React.FC = () => {
  const { currentUser, logout, setAuthSession } = useApp();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'profile' | 'system'>('list');
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
    loadUsers();
  }, []);

  if (currentUser?.role !== 'consultant') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-8">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800 mb-1">Acesso Restrito ao Consultor Master</h2>
        <p className="text-xs text-slate-500">
          Você está logado como @{currentUser?.username} ({currentUser?.role}). Apenas administradores do sistema têm permissão para acessar o painel de usuários.
        </p>
      </div>
    );
  }

  const handleApprove = (id: string, name: string) => {
    const res = approveUserManually(id, currentUser?.username || 'admin');
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
        true // Cria já ativado
      );

      if (res.success) {
        loadUsers();
        setMessage(`Usuário @${newUsername} criado com sucesso e sincronizado no Supabase!`);
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
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Painel Administrativo de Segurança & Acessos</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Gestão de Usuários, Acessos & Permissões
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Gerencie quem tem acesso ao sistema, aprove solicitações de novos cadastros e crie novos usuários sincronizados com o Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setCreateError(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Usuário
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'list' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista de Usuários ({usersList.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setCreateError(null);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'create' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Criar Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Meu Perfil & Logout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'system' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Conexão Supabase / Resend</span>
          </button>
        </div>

        {activeTab === 'list' && (
          <button
            type="button"
            onClick={loadUsers}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        )}
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* ABA 1: LISTA DE USUÁRIOS */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Aguardando Aprovação ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                Aprovados ({usersList.filter((u) => u.status === 'approved').length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhum usuário encontrado nesta categoria.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isPending = user.status === 'pending_approval';
                const isApproved = user.status === 'approved';
                const isRejected = user.status === 'rejected';

                return (
                  <div
                    key={user.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/80 ${
                      isPending ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 mt-0.5">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                          <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold">
                            @{user.username}
                          </span>
                          {isPending && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Aguardando Sua Aprovação
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo & Aprovado
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Recusado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                          {user.email && <span>📧 {user.email}</span>}
                          <div className="flex items-center gap-1.5">
                            <span>👔 Papel:</span>
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                              disabled={user.username.toLowerCase() === 'leonardo' || user.username.toLowerCase() === 'admin'}
                              className="bg-slate-100 border border-slate-300 rounded-md px-2 py-0.5 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="consultant">Consultor (Acesso Total)</option>
                              <option value="manager">Gestor de Unidade</option>
                              <option value="seller">Vendedor / Comercial</option>
                            </select>
                          </div>
                          <span>📅 Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(user.id, user.name)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Aprovar Acesso
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(user.id, user.name)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Recusar
                          </button>
                        </>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => handleApprove(user.id, user.name)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Reativar / Aprovar
                        </button>
                      )}

                      {isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResetPass(user.id, user.username)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Redefinir Senha"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Senha</span>
                          </button>

                          {user.username.toLowerCase() !== 'leonardo' && user.username.toLowerCase() !== 'admin' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReject(user.id, user.name)}
                                className="px-2.5 py-1.5 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Suspender Acesso"
                              >
                                Suspender
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(user.id, user.username)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Excluir Usuário Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CRIAR NOVO USUÁRIO */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Cadastrar Novo Usuário Diretamente
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Usuários criados por aqui já nascem <strong>aprovados e sincronizados com o Supabase</strong>, sem necessidade de aprovação por e-mail.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
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
                placeholder="Ex: Carlos Santos"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome de Usuário (Login) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: carlos.vendas"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  placeholder="Senha para login"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail (Opcional)</label>
                <input
                  type="email"
                  placeholder="carlos@empresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Papel / Nível de Acesso</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer transition"
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

      {/* ABA 3: MEU PERFIL & LOGOUT */}
      {activeTab === 'profile' && currentUser && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-xs font-mono text-indigo-600 font-semibold">@{currentUser.username}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                Administrador Principal
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">E-mail de Notificações:</span>
              <strong className="text-slate-800">{currentUser.email || 'leonardoricardoarantes@gmail.com'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Perfil:</span>
              <strong className="text-slate-800 capitalize">{currentUser.role}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Status de Acesso:</span>
              <strong className="text-emerald-700">Aprovado & Ativo</strong>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Deseja desconectar sua conta?</span>
            <button
              type="button"
              onClick={logout}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair do Sistema (Logout)
            </button>
          </div>
        </div>
      )}

      {/* ABA 4: STATUS DO BANCO DE DADOS & RESEND */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              <Database className="w-5 h-5" />
              <h3 className="text-sm text-slate-900">Banco de Dados Supabase</h3>
            </div>

            <p className="text-slate-600">
              As 7 tabelas do GMC estão criadas e isoladas com o prefixo <code>gmc_</code>:
            </p>

            <ul className="space-y-1.5 font-mono text-[11px] text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <li className="text-emerald-700 font-bold">✅ gmc_users (Autenticação e Acessos)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_companies (Empresas Clientes)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_branches (Filiais e Unidades)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_sellers (Equipe Comercial)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_sales (Vendas e Lançamentos)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_master_goals (Metas Mestre FP&A)</li>
              <li className="text-emerald-700 font-bold">✅ gmc_availabilities (Disponibilidade e Férias)</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              <Mail className="w-5 h-5" />
              <h3 className="text-sm text-slate-900">Serviço de E-mail Resend API</h3>
            </div>

            <p className="text-slate-600">
              Configurado para envio automático de pedidos de aprovação para:
            </p>

            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-indigo-900">
              <strong>Destinatário de Aprovações:</strong> leonardoricardoarantes@gmail.com
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
              <strong>Chave da API:</strong> Configurada via variável VITE_RESEND_API_KEY
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
