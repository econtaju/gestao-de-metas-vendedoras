import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { CommercialIntelligence } from './components/goals/CommercialIntelligence';
import { GoalGenerator } from './components/goals/GoalGenerator';
import { ScenarioSimulator } from './components/goals/ScenarioSimulator';
import { SalesEntry } from './components/sales/SalesEntry';
import { SalesHistory } from './components/sales/SalesHistory';
import { CommissionView } from './components/commissions/CommissionView';
import { SellersView } from './components/sellers/SellersView';
import { SalesImporter } from './components/import/SalesImporter';
import { HistoricalImporter } from './components/import/HistoricalImporter';
import { CompanySettings } from './components/company/CompanySettings';
import { ExecutiveReport } from './components/reports/ExecutiveReport';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { SellerPortalView } from './components/sellers/SellerPortalView';
import { TeamAvailabilityView } from './components/availability/TeamAvailabilityView';
import { LoginView } from './components/auth/LoginView';
import { UserApprovalModal } from './components/auth/UserApprovalModal';
import { UserManagementView } from './components/auth/UserManagementView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { handleTokenAction, syncUsersFromRemote } from './services/authService';
import { ALLOWED_VIEWS_BY_ROLE } from './types';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

const MainContent: React.FC = () => {
  const {
    companies,
    currentView,
    authSession,
    setAuthSession,
    currentUser,
    activeUserRole,
    isUserManagementOpen,
    setIsUserManagementOpen,
  } = useApp();

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Sincronização em segundo plano com o Supabase
  useEffect(() => {
    syncUsersFromRemote().catch(() => {});
  }, []);

  // Se for o primeiro acesso e a empresa principal ainda for a padrão vazia, sugere abrir o assistente
  useEffect(() => {
    if (authSession && currentUser && typeof localStorage !== 'undefined') {
      const hasCompletedWizard = localStorage.getItem('gmc_wizard_dismissed');
      const isDefaultOnly = companies.length === 1 && (companies[0].tradeName === 'Matriz' || companies[0].tradeName === 'Minha Empresa');
      if (!hasCompletedWizard && isDefaultOnly) {
        setIsOnboardingOpen(true);
        localStorage.setItem('gmc_wizard_dismissed', 'true');
      }
    }
  }, [authSession, currentUser, companies]);

  // Processa tokens de aprovação recebidos por link de e-mail na URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action') as 'approve_user' | 'reject_user' | null;
      const token = urlParams.get('token');

      if ((action === 'approve_user' || action === 'reject_user') && token) {
        const result = handleTokenAction(action, token);
        setApprovalMessage(result.message);
        // Limpa os parâmetros da URL sem recarregar a página
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Erro ao processar parâmetro de aprovação da URL', e);
    }
  }, []);

  // Se não estiver autenticado, exibe a tela de login
  if (!authSession || !currentUser) {
    return (
      <LoginView
        onLoginSuccess={(session) => setAuthSession(session)}
        approvalMessage={approvalMessage}
      />
    );
  }

  const renderActiveView = () => {
    const role = currentUser?.role || 'consultant';
    const effectiveRole = role === 'consultant' ? activeUserRole : role;
    const allowedViews = ALLOWED_VIEWS_BY_ROLE[effectiveRole] || ALLOWED_VIEWS_BY_ROLE.consultant;

    let viewToRender = currentView;
    if (!allowedViews.includes(viewToRender)) {
      viewToRender = effectiveRole === 'seller' ? 'seller_portal' : 'dashboard';
    }

    switch (viewToRender) {
      case 'dashboard':
        return <DashboardView />;
      case 'commercial_intelligence':
        return <CommercialIntelligence />;
      case 'goals_generator':
        return <GoalGenerator />;
      case 'simulator':
        return <ScenarioSimulator />;
      case 'sales_entry':
        return <SalesEntry />;
      case 'sales_history':
        return <SalesHistory />;
      case 'commissions':
        return <CommissionView />;
      case 'sellers':
        return <SellersView />;
      case 'team_availability':
        return <TeamAvailabilityView />;
      case 'importer':
        return <SalesImporter />;
      case 'historical_importer':
        return <HistoricalImporter />;
      case 'company_settings':
        return <CompanySettings />;
      case 'reports':
        return <ExecutiveReport />;
      case 'seller_portal':
        return <SellerPortalView />;
      case 'user_management':
        return effectiveRole === 'consultant' ? <UserManagementView /> : <DashboardView />;
      default:
        return effectiveRole === 'seller' ? <SellerPortalView /> : <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Topbar with company selector, branch filter, period selector, and role switcher */}
        <Topbar
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Viewport with bottom compensation padding for mobile bottom bar */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary key={currentView} fallbackViewName={currentView}>
              {renderActiveView()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Smartphones) */}
      <MobileBottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Modal de Gestão e Aprovação de Usuários (Apenas para Consultor Master) */}
      {currentUser && currentUser.role === 'consultant' && (
        <UserApprovalModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
