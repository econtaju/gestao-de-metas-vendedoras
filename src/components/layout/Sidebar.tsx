import React from 'react';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  DollarSign,
  PlusCircle,
  History,
  Users,
  Upload,
  FileText,
  Settings,
  Building2,
  UserCheck,
  RotateCcw,
  Download,
  Plus,
  Compass,
  FolderArchive,
  LayoutDashboard,
  Calendar,
  LogOut,
  ShieldCheck,
  User,
  Trash2,
  X,
} from 'lucide-react';
import { useApp, ActiveView } from '../../context/AppContext';
import { UserRole } from '../../types';

interface SidebarProps {
  onOpenOnboarding: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenOnboarding,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const {
    companies,
    activeCompanyId,
    setActiveCompanyId,
    currentView,
    setCurrentView,
    activeUserRole,
    setActiveUserRole,
    resetToDefaultData,
    exportDatabaseJSON,
    currentUser,
    logout,
    resetAllDataAndLogout,
    setIsUserManagementOpen,
  } = useApp();

  const handleExportBackup = () => {
    const json = exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metarentavel_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const navItems: { id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }>; roles: UserRole[] }[] = [
    { id: 'seller_portal', label: 'Portal do Vendedor', icon: LayoutDashboard, roles: ['seller', 'consultant', 'manager'] },
    { id: 'dashboard', label: 'Dashboard Executivo', icon: BarChart3, roles: ['consultant', 'manager'] },
    { id: 'commercial_intelligence', label: 'Inteligência & Histórico', icon: Compass, roles: ['consultant', 'manager'] },
    { id: 'goals_generator', label: 'Gerador de Metas FP&A', icon: Sparkles, roles: ['consultant', 'manager'] },
    { id: 'simulator', label: 'Simulador de Cenários', icon: TrendingUp, roles: ['consultant', 'manager'] },
    { id: 'commissions', label: 'Cálculo de Comissões', icon: DollarSign, roles: ['consultant', 'manager', 'seller'] },
    { id: 'sales_entry', label: 'Lançamento de Vendas', icon: PlusCircle, roles: ['consultant', 'manager'] },
    { id: 'sales_history', label: 'Histórico de Vendas', icon: History, roles: ['consultant', 'manager', 'seller'] },
    { id: 'sellers', label: 'Equipe Comercial', icon: Users, roles: ['consultant', 'manager'] },
    { id: 'team_availability', label: 'Disponibilidade & Férias', icon: Calendar, roles: ['consultant', 'manager'] },
    { id: 'historical_importer', label: 'Importar Histórico (12M)', icon: FolderArchive, roles: ['consultant', 'manager'] },
    { id: 'importer', label: 'Importação Inteligente', icon: Upload, roles: ['consultant', 'manager'] },
    { id: 'reports', label: 'Relatório Gerencial', icon: FileText, roles: ['consultant', 'manager'] },
    { id: 'company_settings', label: 'Configurações & Custos', icon: Settings, roles: ['consultant', 'manager'] },
    { id: 'user_management', label: 'Gestão de Usuários', icon: ShieldCheck, roles: ['consultant'] },
  ];

  const effectiveRole = currentUser?.role === 'consultant' ? activeUserRole : (currentUser?.role || 'consultant');
  const visibleNavItems = navItems.filter((item) => item.roles.includes(effectiveRole));

  return (
    <>
      {/* Backdrop para telas mobile */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar"
        className={`bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 border-r border-slate-800 select-none h-screen transition-transform duration-300 ease-in-out z-50 ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 w-72 max-w-[85vw] translate-x-0 shadow-2xl'
            : 'fixed inset-y-0 left-0 w-72 -translate-x-full lg:static lg:w-68 lg:translate-x-0 lg:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                MetaRentável
              </span>
              <span className="text-[11px] font-medium text-emerald-400 tracking-wider uppercase block">
                FP&A & Gestão Comercial
              </span>
            </div>
          </div>

          {/* Botão Fechar no Mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Logged User Profile Banner (Top of Sidebar) */}
      {currentUser && (
        <div className="p-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-indigo-600/30 shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-white text-xs truncate">{currentUser.name}</div>
                <div className="text-[10px] text-indigo-400 font-mono">@{currentUser.username}</div>
              </div>
            </div>

            <button
              type="button"
              id="btn-logout-sidebar-top"
              onClick={logout}
              title="Sair do Sistema / Logout"
              className="flex items-center gap-1 px-2 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>

          {currentUser.role === 'consultant' && (
            <button
              type="button"
              id="btn-open-user-management-sidebar"
              onClick={() => {
                setIsUserManagementOpen(true);
                onCloseMobile?.();
              }}
              className="w-full mt-2.5 py-1.5 px-2 bg-indigo-900/40 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>👥 Painel de Gestão de Usuários</span>
            </button>
          )}
        </div>
      )}

      {/* Multi-Company Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Empresa Cliente
          </span>
          <button
            id="btn-new-company-wizard"
            onClick={onOpenOnboarding}
            title="Cadastrar Nova Empresa (Assistente)"
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        </div>
        <select
          id="select-active-company"
          value={activeCompanyId}
          onChange={(e) => setActiveCompanyId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tradeName} ({c.segment})
            </option>
          ))}
        </select>
      </div>

      {/* Profile / Role Switcher - Apenas visível para consultor simular visões */}
      {currentUser?.role === 'consultant' && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Simular Perfil
            </span>
            <span className="text-[9px] text-emerald-400 font-mono">Modo Consultor</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg text-[11px]">
            <button
              id="role-consultant"
              onClick={() => setActiveUserRole('consultant')}
              className={`py-1 rounded font-medium transition text-center ${
                activeUserRole === 'consultant'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Consultor
            </button>
            <button
              id="role-manager"
              onClick={() => setActiveUserRole('manager')}
              className={`py-1 rounded font-medium transition text-center ${
                activeUserRole === 'manager'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gestor
            </button>
            <button
              id="role-seller"
              onClick={() => setActiveUserRole('seller')}
              className={`py-1 rounded font-medium transition text-center ${
                activeUserRole === 'seller'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vendedor
            </button>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 pb-1">
          Módulos Principais
        </div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                setCurrentView(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900/90 text-xs">
        {/* Botão de Logout Dedicado */}
        <button
          type="button"
          id="btn-logout-sidebar-bottom"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>🚪 Fazer Logout (Sair)</span>
        </button>

        <button
          id="btn-onboarding-sidebar"
          onClick={() => {
            onOpenOnboarding();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-medium transition border border-slate-700"
        >
          <Compass className="w-3.5 h-3.5" />
          Guia de Onboarding
        </button>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            id="btn-backup-json"
            onClick={handleExportBackup}
            title="Exportar backup completo em JSON"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/60 text-[11px]"
          >
            <Download className="w-3.5 h-3.5" />
            Backup
          </button>
          <button
            id="btn-wipe-data"
            onClick={() => {
              if (window.confirm('Tem certeza de que deseja ZERAR TODOS OS DADOS e deslogar imediatamente?')) {
                resetAllDataAndLogout();
              }
            }}
            title="Zerar todos os dados locais e deslogar"
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white rounded-lg transition border border-rose-800/60 text-[11px] font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Zerar Tudo
          </button>
        </div>

        <div className="text-[10px] text-center text-slate-500 font-mono mt-1">
          v2.5.0 • MetaRentável (Online)
        </div>
      </div>
    </aside>
  </>
  );
};
