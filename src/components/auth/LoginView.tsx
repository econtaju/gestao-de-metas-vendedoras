import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Mail,
  Building2,
  Sparkles,
  KeyRound,
  Clock,
} from 'lucide-react';
import { authenticateUser, registerNewUser } from '../../services/authService';
import { AuthSession, UserRole } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  approvalMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  approvalMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form states - Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('consultant');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await authenticateUser(loginUsername, loginPassword);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setLoginError(res.message || 'Erro ao realizar login.');
      }
    } catch {
      setLoginError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setRegError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('As senhas digitadas não coincidem.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await registerNewUser(
        regName,
        regUsername,
        regPassword,
        regRole,
        regEmail
      );

      if (res.success) {
        setRegSuccess(res.message);
        setRegName('');
        setRegUsername('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setRegError(res.message);
      }
    } catch {
      setRegError('Erro ao solicitar cadastro. Tente novamente.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-600 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-500/20 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gestão de Metas Clientes
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Acesso Restrito & Controle de Metas FP&A
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Banner de Mensagem de Aprovação por URL (se clicado no e-mail) */}
        {approvalMessage && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-3 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-emerald-300 mb-0.5">Notificação de Acesso:</strong>
              {approvalMessage}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-white">
          {/* Navegação de Abas */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
                setRegSuccess(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Solicitar Acesso
            </button>
          </div>

          {/* TAB 1: ENTRAR (LOGIN) */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username-input"
                    type="text"
                    required
                    placeholder="Seu nome de usuário"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    placeholder="Sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {loginLoading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Acessar Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Card de Acesso Rápido / Credencial Consultor Master */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                    👤 Conta do Consultor Master:
                  </span>
                  <span className="font-mono text-indigo-200 text-xs">
                    Usuário: <strong>leonardo</strong> • Senha: <strong>admin</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    id="btn-quick-fill-login"
                    onClick={() => {
                      setLoginUsername('leonardo');
                      setLoginPassword('admin');
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
                    title="Preencher Usuário e Senha"
                  >
                    Preencher
                  </button>
                  <button
                    type="button"
                    id="btn-quick-login-master"
                    onClick={async () => {
                      setLoginUsername('leonardo');
                      setLoginPassword('admin');
                      setLoginLoading(true);
                      setLoginError(null);
                      try {
                        const res = await authenticateUser('leonardo', 'admin');
                        if (res.success && res.session) {
                          onLoginSuccess(res.session);
                        } else {
                          setLoginError(res.message || 'Erro ao realizar login.');
                        }
                      } catch {
                        setLoginError('Ocorreu um erro inesperado.');
                      } finally {
                        setLoginLoading(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                    title="Preencher e Acessar Diretamente com 1 Clique"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>1-Clique</span>
                  </button>
                </div>
              </div>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-500">
                  Acesso restrito a usuários cadastrados. Para novos gestores ou vendedoras, solicite acesso na aba ao lado ou crie no Painel Administrativo.
                </span>
              </div>
            </form>
          )}

          {/* TAB 2: SOLICITAR ACESSO (CADASTRO COM APROVAÇÃO RESEND) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-emerald-300 mb-1">Aguardando Aprovação!</strong>
                    <span>{regSuccess}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome de Usuário (Login) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: joao.silva"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mail para Notificações (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="seuemail@empresa.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 4 dígitos"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Papel Solicitado
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-medium transition"
                >
                  <option value="consultant">Consultor FP&A (Acesso Completo)</option>
                  <option value="manager">Gerente de Unidade</option>
                  <option value="seller">Vendedor / Comercial</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Um e-mail de aprovação com botão de liberação será enviado diretamente para <strong>leonardoricardoarantes@gmail.com</strong> via Resend API.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {regLoading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Pedido de Aprovação</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Versão e Build do Sistema */}
        <div className="text-center mt-4">
          <span className="inline-block px-3 py-1 bg-slate-900/80 border border-slate-700/60 rounded-full text-[10px] font-mono text-slate-400">
            🔒 MetaRentável v2.5.0 • Build 2026.09.01 • Acesso Restrito
          </span>
        </div>
      </div>
    </div>
  );
};
