import React from 'react';
import {
  LayoutDashboard,
  Target,
  PlusCircle,
  DollarSign,
  Menu,
  BarChart3,
} from 'lucide-react';
import { useApp, ActiveView } from '../../context/AppContext';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const { currentView, setCurrentView, currentUser, activeUserRole } = useApp();

  const effectiveRole =
    currentUser?.role === 'consultant'
      ? activeUserRole
      : currentUser?.role || 'consultant';

  const isSeller = effectiveRole === 'seller';
  const homeView: ActiveView = isSeller ? 'seller_portal' : 'dashboard';

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegação móvel inferior"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Início (Dashboard / Portal) */}
        <button
          type="button"
          onClick={() => setCurrentView(homeView)}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
            currentView === homeView
              ? 'text-emerald-600 font-bold bg-emerald-50/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isSeller ? (
            <LayoutDashboard className="w-5 h-5" />
          ) : (
            <BarChart3 className="w-5 h-5" />
          )}
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isSeller ? 'Portal' : 'Início'}
          </span>
        </button>

        {/* 2. Metas (Gerador de Metas) */}
        {!isSeller && (
          <button
            type="button"
            onClick={() => setCurrentView('goals_generator')}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'goals_generator'
                ? 'text-indigo-600 font-bold bg-indigo-50/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Metas</span>
          </button>
        )}

        {/* 3. Lançamento Rápido de Vendas (Destaque Central) */}
        {!isSeller ? (
          <button
            type="button"
            onClick={() => setCurrentView('sales_entry')}
            className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                currentView === 'sales_entry'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-100'
                  : 'bg-emerald-600 text-white shadow-emerald-600/30'
              }`}
            >
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 mt-1">
              Lançar
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentView('sales_history')}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'sales_history'
                ? 'text-emerald-600 font-bold bg-emerald-50/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Vendas</span>
          </button>
        )}

        {/* 4. Comissões */}
        <button
          type="button"
          onClick={() => setCurrentView('commissions')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'commissions'
              ? 'text-emerald-600 font-bold bg-emerald-50/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Comissão</span>
        </button>

        {/* 5. Menu Completo (Abre Gaveta Lateral) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer hover:bg-slate-100/80"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};
