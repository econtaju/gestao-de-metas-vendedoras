import React, { useState } from 'react';
import {
  Bell,
  Building2,
  Calendar,
  Filter,
  PlusCircle,
  TrendingUp,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  LogOut,
  ShieldCheck,
  User,
  Menu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopbarProps {
  onOpenOnboarding: () => void;
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenOnboarding, onOpenMobileMenu }) => {
  const {
    activeCompany,
    companyBranches,
    companySellers,
    activeBranchId,
    setActiveBranchId,
    activePeriodNumber,
    setActivePeriodNumber,
    activePeriodType,
    setActivePeriodType,
    activeSellerId,
    setActiveSellerId,
    setCurrentView,
    alerts,
    dismissAlert,
    activeUserRole,
    currentUser,
    logout,
    resetAllDataAndLogout,
    setIsUserManagementOpen,
  } = useApp();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const effectiveRole = currentUser?.role === 'consultant' ? activeUserRole : (currentUser?.role || 'consultant');

  // Available periods — semanal até 52 semanas, mensal 12 meses
  const availableWeeks = Array.from({ length: 52 }, (_, i) => i + 1).reverse();
  const monthLabels = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <header
      id="main-topbar"
      className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs"
    >
      {/* Left: Hamburger Menu, Active Company Info & Unit Filter */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          id="btn-open-mobile-menu"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
          title="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="font-bold text-slate-800 text-sm md:text-base tracking-tight truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none">
              {activeCompany.tradeName}
            </h1>
            <span className="hidden sm:inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
              {activeCompany.segment}
            </span>
            <span className="hidden md:inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0">
              {activeCompany.numberOfLevels} Níveis
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 hidden md:block shrink-0" />

        {/* Unit Selector: Consolidado / Matriz / Filial */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1" />
          <select
            id="topbar-unit-filter"
            value={activeBranchId}
            onChange={(e) => setActiveBranchId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-2"
          >
            <option value="all">Consolidado (Todas as Unidades)</option>
            {companyBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.type === 'headquarters' ? '🏢 Matriz: ' : '🏬 Filial: '}
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Filters & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
          <select
            id="topbar-period-type"
            value={activePeriodType}
            onChange={(e) => setActivePeriodType(e.target.value as any)}
            className="bg-transparent text-xs font-medium text-slate-600 outline-none cursor-pointer border-r border-slate-200 pr-1.5 mr-1"
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>

          <select
            id="topbar-period-number"
            value={activePeriodNumber}
            onChange={(e) => {
              const val = e.target.value;
              setActivePeriodNumber(val === 'all' ? 'all' : Number(val));
            }}
            className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-2"
          >
            <option value="all">
              {activePeriodType === 'weekly' ? 'Todas as Semanas' : 'Todos os Meses'}
            </option>
            {activePeriodType === 'weekly'
              ? availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    Semana {w.toString().padStart(2, '0')} {w === 12 ? '(Atual)' : ''}
                  </option>
                ))
              : Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Mês {m.toString().padStart(2, '0')} - {monthLabels[m - 1]}
                  </option>
                ))}
          </select>
        </div>

        {/* Seller Filter (Optional) */}
        {effectiveRole !== 'seller' && (
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
            <select
              id="topbar-seller-filter"
              value={activeSellerId}
              onChange={(e) => setActiveSellerId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer pr-2"
            >
              <option value="all">Todos os Vendedores</option>
              {companySellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            id="topbar-alerts-bell"
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Central de Alertas"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Modal */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-sm text-slate-800">
                    Alertas Inteligentes ({alerts.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-2 space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Nenhum alerta pendente no momento.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-lg text-xs flex items-start justify-between gap-2 ${
                        alert.type === 'danger'
                          ? 'bg-rose-50 border border-rose-100 text-rose-900'
                          : alert.type === 'warning'
                          ? 'bg-amber-50 border border-amber-100 text-amber-900'
                          : 'bg-emerald-50 border border-emerald-100 text-emerald-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {alert.type === 'danger' && (
                          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        )}
                        {alert.type === 'warning' && (
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        )}
                        {alert.type === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-xs">{alert.title}</div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Dispensar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick CTA Buttons */}
        {effectiveRole !== 'seller' && (
          <>
            <button
              id="topbar-btn-nova-empresa"
              onClick={onOpenOnboarding}
              title="Cadastrar nova empresa cliente"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 rounded-lg text-[11px] font-semibold transition"
            >
              <span className="text-emerald-600 font-bold text-base leading-none">+</span>
              Empresa
            </button>
            <button
              id="topbar-btn-simulator"
              onClick={() => setCurrentView('simulator')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
              Simular Metas
            </button>

            <button
              id="topbar-btn-new-sale"
              onClick={() => setCurrentView('sales_entry')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lançar Vendas</span>
            </button>
          </>
        )}

        {/* User Profile, Approvals Panel & Logout Button */}
        {currentUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            {currentUser.role === 'consultant' ? (
              <button
                type="button"
                id="btn-open-user-management-topbar"
                onClick={() => setIsUserManagementOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                title="Gerenciar Usuários e Aprovações de Acesso"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-bold text-xs leading-none text-slate-900">{currentUser.name}</div>
                  <div className="text-[10px] text-indigo-600 font-mono">@{currentUser.username}</div>
                </div>
                <ShieldCheck className="w-4 h-4 text-indigo-600 ml-0.5 hidden sm:block" />
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold shadow-xs"
                title={`Logado como @${currentUser.username} (${currentUser.role})`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-bold text-xs leading-none text-slate-900">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">@{currentUser.username}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              id="btn-logout-topbar"
              onClick={logout}
              className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              title="Fazer Logout e Sair da Conta"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Sair</span>
            </button>

            <button
              type="button"
              id="btn-reset-data-topbar"
              onClick={() => {
                if (window.confirm('Deseja limpar todo o histórico local e deslogar?')) {
                  resetAllDataAndLogout();
                }
              }}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
              title="Limpar todos os dados locais e deslogar"
            >
              <span>Zerar Dados</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
