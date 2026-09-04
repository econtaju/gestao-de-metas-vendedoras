import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Company,
  Branch,
  BranchType,
  Seller,
  SaleRecord,
  UserRole,
  PeriodType,
  SystemAlert,
  CalculationResult,
  GoalLevel,
  MonthlyHistoricalRecord,
  ActiveView,
  SellerAlias,
  CompanyAlias,
  ImportTemplate,
  ImportAuditRecord,
  SmartImportPayload,
  HistoricalImportSession,
  MonthlyMasterGoal,
  WeeklyWeightTemplate,
  SellerGoalDetail,
  TeamParticipationSummary,
  GoalSimulationScenario,
  SellerAvailability,
  WorkingDaysSettings,
  AvailabilityRedistributionResult,
  AvailabilityRedistributionMethod,
  AppUser,
  AuthSession,
  ALLOWED_VIEWS_BY_ROLE,
} from '../types';
import {
  DEFAULT_WORKING_DAYS_SETTINGS,
  calculateAvailabilityRedistribution,
} from '../services/availabilityEngine';
import { getStoredSession, saveStoredSession } from '../services/authService';
import {
  INITIAL_COMPANIES,
  INITIAL_BRANCHES,
  INITIAL_SELLERS,
  INITIAL_MONTHLY_HISTORY,
  INITIAL_SELLER_ALIASES,
  INITIAL_COMPANY_ALIASES,
  INITIAL_IMPORT_AUDITS,
  INITIAL_MASTER_GOALS,
  generateInitialSales,
} from '../data/mockData';
import {
  calculateSalePerformance,
  getActiveLevels,
} from '../services/financialEngine';
import {
  DEFAULT_IMPORT_TEMPLATES,
  normalizeText,
  parseBrazilianCurrency,
} from '../services/smartImportEngine';
import { buildOfficialDatabaseCommit } from '../services/historicalImportEngine';
import {
  DEFAULT_WEIGHT_TEMPLATES,
  buildCommercialWeeks,
  validateWeeklyWeights,
  calculateSellerGoalDetail,
  validateTeamParticipation,
  redistributeTeamShares,
} from '../services/masterGoalEngine';
import {
  syncCompanyToSupabase,
  fetchCompaniesFromSupabase,
  deleteCompanyFromSupabase,
  syncBranchToSupabase,
  fetchBranchesFromSupabase,
  deleteBranchFromSupabase,
  syncSellerToSupabase,
  fetchSellersFromSupabase,
  deleteSellerFromSupabase,
  syncMasterGoalToSupabase,
  fetchMasterGoalsFromSupabase,
  syncSaleToSupabase,
  fetchSalesFromSupabase,
  deleteSaleFromSupabase,
} from '../services/supabaseService';
import { offlineSyncManager, OfflineQueueItem } from '../services/offlineSyncService';

export type { ActiveView };

interface AppContextType {
  // State
  companies: Company[];
  branches: Branch[];
  sellers: Seller[];
  sales: SaleRecord[];
  monthlyHistory: Record<string, MonthlyHistoricalRecord[]>;
  sellerAliases: SellerAlias[];
  companyAliases: CompanyAlias[];
  importTemplates: ImportTemplate[];
  importAudits: ImportAuditRecord[];
  masterGoals: Record<string, MonthlyMasterGoal>;
  weightTemplates: WeeklyWeightTemplate[];
  goalSimulations: GoalSimulationScenario[];
  activeCompanyId: string;
  activeBranchId: string; // 'all' or branchId
  activePeriodNumber: number | 'all';
  activePeriodType: PeriodType;
  activeUserRole: UserRole;
  activeSellerId: string; // for filtering or seller portal
  currentView: ActiveView;
  alerts: SystemAlert[];

  // Setters
  setActiveCompanyId: (id: string) => void;
  setActiveBranchId: (id: string) => void;
  setActivePeriodNumber: (period: number | 'all') => void;
  setActivePeriodType: (type: PeriodType) => void;
  setActiveUserRole: (role: UserRole) => void;
  setActiveSellerId: (id: string) => void;
  setCurrentView: (view: ActiveView) => void;

  // Selected Entities
  activeCompany: Company;
  companyBranches: Branch[];
  companySellers: Seller[];
  companySales: SaleRecord[];
  companyMonthlyHistory: MonthlyHistoricalRecord[];
  filteredSales: SaleRecord[];

  // Nova Arquitetura de Metas
  activeMasterGoal: MonthlyMasterGoal;
  saveMasterGoal: (goal: MonthlyMasterGoal) => void;
  publishMasterGoal: (goalOrId: string | MonthlyMasterGoal) => boolean;
  saveWeightTemplate: (template: WeeklyWeightTemplate) => void;
  deleteWeightTemplate: (templateId: string) => void;
  saveGoalSimulation: (sim: GoalSimulationScenario) => void;
  deleteGoalSimulation: (simId: string) => void;
  applyGoalSimulationAsOfficial: (sim: GoalSimulationScenario) => void;
  updateSellerShare: (sellerId: string, share: number, originType?: 'historical' | 'manual' | 'adjusted') => void;
  getMasterGoalForPeriod: (companyId: string, branchId: string, year: number, monthNumber: number) => MonthlyMasterGoal;
  getSellerGoalDetail: (sellerId: string, monthNumber?: number, year?: number) => SellerGoalDetail | null;
  getTeamParticipation: (branchId?: string, customMonthlyTarget?: number) => TeamParticipationSummary;
  autoRedistributeTeamParticipation: (branchId: string, changedSellerId: string, newShare: number) => void;
  // Aplica meta mensal diretamente de Configurações para todas as filiais → sincroniza masterGoals
  applyMonthlyTargetToAllBranches: (monthlyTarget: number, monthNumber: number, year: number) => void;

  // CRUD Actions
  addCompany: (company: (Omit<Company, 'id' | 'createdAt'> & { id?: string; createdAt?: string })) => string;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addBranch: (branch: (Omit<Branch, 'id'> & { id?: string })) => string;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  addSeller: (seller: (Omit<Seller, 'id'> & { id?: string })) => string;
  batchAddSellers: (sellers: Omit<Seller, 'id'>[]) => number;
  updateSeller: (id: string, updates: Partial<Seller>) => void;
  deleteSeller: (id: string) => void;

  addSale: (sale: Omit<SaleRecord, 'id' | 'createdAt'>) => string;
  updateSale: (id: string, updates: Partial<SaleRecord>) => void;
  deleteSale: (id: string) => void;
  batchAddSales: (newSales: Omit<SaleRecord, 'id' | 'createdAt'>[]) => number;

  updateMonthlyRecord: (
    companyId: string,
    monthNumber: number,
    year: number,
    updates: Partial<MonthlyHistoricalRecord>
  ) => void;

  // Smart Import Actions
  saveSellerAlias: (companyId: string, sellerId: string, sourceName: string) => void;
  deleteSellerAlias: (id: string) => void;
  saveCompanyAlias: (companyId: string, branchId: string, sourceName: string) => void;
  deleteCompanyAlias: (id: string) => void;
  saveImportTemplate: (template: ImportTemplate) => void;
  deleteImportTemplate: (id: string) => void;
  addImportAudit: (audit: ImportAuditRecord) => void;
  confirmSmartImport: (payload: SmartImportPayload) => { importedSalesCount: number; periodNumber: number };
  reprocessAudit: (auditId: string) => SmartImportPayload | null;

  // Historical Import Actions
  historicalSessions: Record<string, HistoricalImportSession>;
  saveHistoricalSession: (session: HistoricalImportSession) => void;
  deleteHistoricalSession: (sessionId: string) => void;
  commitHistoricalSessionToOfficial: (session: HistoricalImportSession) => {
    monthlyCount: number;
    salesCount: number;
    sellersCount: number;
  };

  applySuggestedGoals: (levels: GoalLevel[]) => void;
  resetToDefaultData: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonStr: string) => boolean;

  // Global Performance Calculations
  getSellerCalculation: (sale: SaleRecord) => CalculationResult;
  dismissAlert: (id: string) => void;

  // Módulo de Disponibilidade & Férias
  availabilities: SellerAvailability[];
  workingDaysSettings: WorkingDaysSettings;
  addAvailability: (item: Omit<SellerAvailability, 'id' | 'createdAt' | 'updatedAt'>) => SellerAvailability;
  updateAvailability: (id: string, updates: Partial<SellerAvailability>) => void;
  deleteAvailability: (id: string) => void;
  updateWorkingDaysSettings: (settings: WorkingDaysSettings) => void;
  calculateAvailabilityRedistributionHelper: (
    companyId: string,
    branchId: string,
    year: number,
    monthNumber: number,
    overrideMethod?: AvailabilityRedistributionMethod,
    manualAllocations?: Record<string, number>
  ) => AvailabilityRedistributionResult;

  // Autenticação & Gestão de Usuários
  currentUser: AppUser | null;
  authSession: AuthSession | null;
  setAuthSession: (session: AuthSession | null) => void;
  logout: () => void;
  resetAllDataAndLogout: () => void;
  isUserManagementOpen: boolean;
  setIsUserManagementOpen: (open: boolean) => void;

  // Resiliência Offline & Sincronização
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTimestamp: number | null;
  triggerManualSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// Purgador automático de dados mockados legados do navegador
if (typeof window !== 'undefined') {
  try {
    const hasPurged = localStorage.getItem('gmc_purged_mock_v2');
    if (!hasPurged) {
      const legacyKeys = [
        'metarentavel_companies_v1',
        'metarentavel_branches_v1',
        'metarentavel_sellers_v1',
        'metarentavel_sales_v1',
        'metarentavel_monthly_history_v1',
        'metarentavel_active_company_v1',
        'metarentavel_active_role_v1',
        'metarentavel_seller_aliases_v1',
        'metarentavel_company_aliases_v1',
        'metarentavel_import_templates_v1',
        'metarentavel_import_audits_v1',
        'metarentavel_historical_sessions_v1',
        'metarentavel_master_goals_v1',
        'metarentavel_weight_templates_v1',
        'metarentavel_goal_simulations_v1',
        'metarentavel_availabilities_v1',
        'metarentavel_working_days_v1',
        'gmc_auth_session_v1',
      ];
      legacyKeys.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('gmc_purged_mock_v2', 'true');
    }
  } catch {}
}

const STORAGE_KEYS = {
  COMPANIES: 'gmc_companies_v2',
  BRANCHES: 'gmc_branches_v2',
  SELLERS: 'gmc_sellers_v2',
  SALES: 'gmc_sales_v2',
  MONTHLY_HISTORY: 'gmc_monthly_history_v2',
  ACTIVE_COMPANY: 'gmc_active_company_v2',
  ACTIVE_ROLE: 'gmc_active_role_v2',
  SELLER_ALIASES: 'gmc_seller_aliases_v2',
  COMPANY_ALIASES: 'gmc_company_aliases_v2',
  IMPORT_TEMPLATES: 'gmc_import_templates_v2',
  IMPORT_AUDITS: 'gmc_import_audits_v2',
  HISTORICAL_SESSIONS: 'gmc_historical_sessions_v2',
  MASTER_GOALS: 'gmc_master_goals_v2',
  WEIGHT_TEMPLATES: 'gmc_weight_templates_v2',
  GOAL_SIMULATIONS: 'gmc_goal_simulations_v2',
  AVAILABILITIES: 'gmc_availabilities_v2',
  WORKING_DAYS: 'gmc_working_days_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or defaults
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_COMPANIES;
    } catch {
      return INITIAL_COMPANIES;
    }
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_BRANCHES;
    } catch {
      return INITIAL_BRANCHES;
    }
  });

  const [sellers, setSellers] = useState<Seller[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELLERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SELLERS;
    } catch {
      return INITIAL_SELLERS;
    }
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return generateInitialSales();
    } catch {
      return generateInitialSales();
    }
  });

  const [monthlyHistory, setMonthlyHistory] = useState<Record<string, MonthlyHistoricalRecord[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MONTHLY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed;
      }
      return INITIAL_MONTHLY_HISTORY;
    } catch {
      return INITIAL_MONTHLY_HISTORY;
    }
  });

  const [sellerAliases, setSellerAliases] = useState<SellerAlias[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELLER_ALIASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_SELLER_ALIASES;
    } catch {
      return INITIAL_SELLER_ALIASES;
    }
  });

  const [companyAliases, setCompanyAliases] = useState<CompanyAlias[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANY_ALIASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_COMPANY_ALIASES;
    } catch {
      return INITIAL_COMPANY_ALIASES;
    }
  });

  const [importTemplates, setImportTemplates] = useState<ImportTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IMPORT_TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return DEFAULT_IMPORT_TEMPLATES;
    } catch {
      return DEFAULT_IMPORT_TEMPLATES;
    }
  });

  const [importAudits, setImportAudits] = useState<ImportAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IMPORT_AUDITS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_IMPORT_AUDITS;
    } catch {
      return INITIAL_IMPORT_AUDITS;
    }
  });

  const [historicalSessions, setHistoricalSessions] = useState<Record<string, HistoricalImportSession>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORICAL_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
      return {};
    } catch {
      return {};
    }
  });

  const [masterGoals, setMasterGoals] = useState<Record<string, MonthlyMasterGoal>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MASTER_GOALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
      return INITIAL_MASTER_GOALS;
    } catch {
      return INITIAL_MASTER_GOALS;
    }
  });

  const [weightTemplates, setWeightTemplates] = useState<WeeklyWeightTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WEIGHT_TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return DEFAULT_WEIGHT_TEMPLATES;
    } catch {
      return DEFAULT_WEIGHT_TEMPLATES;
    }
  });

  const [goalSimulations, setGoalSimulations] = useState<GoalSimulationScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOAL_SIMULATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [availabilities, setAvailabilities] = useState<SellerAvailability[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AVAILABILITIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [authSession, setAuthSessionState] = useState<AuthSession | null>(() => getStoredSession());
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const currentUser = authSession?.user || null;

  const [activeUserRole, setActiveUserRoleState] = useState<UserRole>(() => {
    const session = getStoredSession();
    return session?.user?.role || 'consultant';
  });

  const [currentView, setCurrentViewState] = useState<ActiveView>(() => {
    const session = getStoredSession();
    return session?.user?.role === 'seller' ? 'seller_portal' : 'dashboard';
  });

  const setCurrentView = (view: ActiveView) => {
    const role = currentUser?.role || 'consultant';
    const effectiveRole = role === 'consultant' ? activeUserRole : role;
    const allowed = ALLOWED_VIEWS_BY_ROLE[effectiveRole] || ALLOWED_VIEWS_BY_ROLE.consultant;
    if (allowed.includes(view)) {
      setCurrentViewState(view);
    } else {
      setCurrentViewState(effectiveRole === 'seller' ? 'seller_portal' : 'dashboard');
    }
  };

  const setActiveUserRole = (role: UserRole) => {
    setActiveUserRoleState(role);
    const allowed = ALLOWED_VIEWS_BY_ROLE[role] || ALLOWED_VIEWS_BY_ROLE.consultant;
    if (!allowed.includes(currentView)) {
      setCurrentViewState(role === 'seller' ? 'seller_portal' : 'dashboard');
    }
  };

  const setAuthSession = (session: AuthSession | null) => {
    setAuthSessionState(session);
    saveStoredSession(session);
    if (session?.user?.role) {
      setActiveUserRoleState(session.user.role);
      if (session.user.role === 'seller') {
        setCurrentViewState('seller_portal');
      } else {
        setCurrentViewState('dashboard');
      }
    } else {
      setActiveUserRoleState('consultant');
      setCurrentViewState('dashboard');
      setIsUserManagementOpen(false);
    }
  };

  const logout = () => {
    setAuthSession(null);
  };

  const resetAllDataAndLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    setAuthSession(null);
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  const [workingDaysSettings, setWorkingDaysSettings] = useState<WorkingDaysSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKING_DAYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.weeklySchedule)) return parsed;
      }
      return DEFAULT_WORKING_DAYS_SETTINGS;
    } catch {
      return DEFAULT_WORKING_DAYS_SETTINGS;
    }
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      if (saved && companies.some((c) => c.id === saved)) return saved;
      return companies[0]?.id || 'comp-principal';
    } catch {
      return 'comp-principal';
    }
  });

  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [activePeriodNumber, setActivePeriodNumber] = useState<number | 'all'>(12); // Default to week 12
  const [activePeriodType, setActivePeriodType] = useState<PeriodType>('weekly');
  const [activeSellerId, setActiveSellerId] = useState<string>('all');
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Resiliência Offline e Sincronização em Segundo Plano (Outbox Queue)
  const [isOnline, setIsOnline] = useState<boolean>(() => offlineSyncManager.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => offlineSyncManager.getIsSyncing());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineSyncManager.getQueue().length);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(() => offlineSyncManager.getLastSyncTimestamp());

  // Funções seguras de sincronização com proteção offline e enfileiramento resiliente
  const safeSyncCompany = useCallback((company: Company) => {
    syncCompanyToSupabase(company).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('sync_company', company.id, company);
    }).catch(() => {
      offlineSyncManager.enqueueItem('sync_company', company.id, company);
    });
  }, []);

  const safeDeleteCompany = useCallback((companyId: string) => {
    deleteCompanyFromSupabase(companyId).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('delete_company', companyId, { id: companyId });
    }).catch(() => {
      offlineSyncManager.enqueueItem('delete_company', companyId, { id: companyId });
    });
  }, []);

  const safeSyncBranch = useCallback((branch: Branch) => {
    syncBranchToSupabase(branch).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('sync_branch', branch.id, branch);
    }).catch(() => {
      offlineSyncManager.enqueueItem('sync_branch', branch.id, branch);
    });
  }, []);

  const safeDeleteBranch = useCallback((branchId: string) => {
    deleteBranchFromSupabase(branchId).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('delete_branch', branchId, { id: branchId });
    }).catch(() => {
      offlineSyncManager.enqueueItem('delete_branch', branchId, { id: branchId });
    });
  }, []);

  const safeSyncSeller = useCallback((seller: Seller) => {
    syncSellerToSupabase(seller).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('sync_seller', seller.id, seller);
    }).catch(() => {
      offlineSyncManager.enqueueItem('sync_seller', seller.id, seller);
    });
  }, []);

  const safeDeleteSeller = useCallback((sellerId: string) => {
    deleteSellerFromSupabase(sellerId).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('delete_seller', sellerId, { id: sellerId });
    }).catch(() => {
      offlineSyncManager.enqueueItem('delete_seller', sellerId, { id: sellerId });
    });
  }, []);

  const safeSyncSale = useCallback((sale: SaleRecord) => {
    syncSaleToSupabase(sale).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('sync_sale', sale.id, sale);
    }).catch(() => {
      offlineSyncManager.enqueueItem('sync_sale', sale.id, sale);
    });
  }, []);

  const safeDeleteSale = useCallback((saleId: string) => {
    deleteSaleFromSupabase(saleId).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('delete_sale', saleId, { id: saleId });
    }).catch(() => {
      offlineSyncManager.enqueueItem('delete_sale', saleId, { id: saleId });
    });
  }, []);

  const safeSyncMasterGoal = useCallback((goal: MonthlyMasterGoal) => {
    syncMasterGoalToSupabase(goal).then((ok) => {
      if (!ok) offlineSyncManager.enqueueItem('sync_master_goal', goal.id, goal);
    }).catch(() => {
      offlineSyncManager.enqueueItem('sync_master_goal', goal.id, goal);
    });
  }, []);

  // Carrega e mescla dados da Nuvem (Supabase) respeitando alterações locais pendentes
  const loadCloudData = useCallback(async () => {
    try {
      const [cloudCompanies, cloudBranches, cloudSellers, cloudGoals, cloudSales] = await Promise.all([
        fetchCompaniesFromSupabase(),
        fetchBranchesFromSupabase(),
        fetchSellersFromSupabase(),
        fetchMasterGoalsFromSupabase(),
        fetchSalesFromSupabase(),
      ]);

      const pendingQueue = offlineSyncManager.getQueue();
      const pendingIds = new Set(pendingQueue.map((item) => item.entityId));

      if (cloudCompanies && cloudCompanies.length > 0) {
        setCompanies((prev) => {
          const map = new Map<string, Company>();
          prev.forEach((c) => map.set(c.id, c));
          cloudCompanies.forEach((c) => {
            if (!pendingIds.has(c.id)) {
              map.set(c.id, c);
            }
          });
          return Array.from(map.values());
        });
      }

      if (cloudBranches && cloudBranches.length > 0) {
        setBranches((prev) => {
          const map = new Map<string, Branch>();
          prev.forEach((b) => map.set(b.id, b));
          cloudBranches.forEach((b) => {
            if (!pendingIds.has(b.id)) {
              map.set(b.id, b);
            }
          });
          return Array.from(map.values());
        });
      }

      if (cloudSellers && cloudSellers.length > 0) {
        setSellers((prev) => {
          const map = new Map<string, Seller>();
          prev.forEach((s) => map.set(s.id, s));
          cloudSellers.forEach((s) => {
            if (!pendingIds.has(s.id)) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }

      if (cloudGoals && Object.keys(cloudGoals).length > 0) {
        setMasterGoals((prev) => {
          const next = { ...prev };
          Object.entries(cloudGoals).forEach(([k, g]) => {
            if (!pendingIds.has(g.id)) {
              next[k] = g;
            }
          });
          return next;
        });
      }

      if (cloudSales && cloudSales.length > 0) {
        setSales((prev) => {
          const map = new Map<string, SaleRecord>();
          prev.forEach((s) => map.set(s.id, s));
          cloudSales.forEach((s) => {
            if (!pendingIds.has(s.id)) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }
      setLastSyncTimestamp(Date.now());
    } catch (err) {
      console.warn('Sincronização em background do Supabase:', err);
    }
  }, []);

  // Gatilho manual de sincronização chamado pelo botão na Topbar / Banner
  const triggerManualSync = useCallback(async () => {
    await offlineSyncManager.checkRealConnection();
    await offlineSyncManager.processQueue();
    await loadCloudData();
    setLastSyncTimestamp(offlineSyncManager.getLastSyncTimestamp());
  }, [loadCloudData]);

  // Listeners de conectividade e sincronização em segundo plano
  useEffect(() => {
    const unsubNet = offlineSyncManager.subscribeToNetwork((online) => setIsOnline(online));
    const unsubQueue = offlineSyncManager.subscribeToQueue((q) => setPendingSyncCount(q.length));
    const unsubSync = offlineSyncManager.subscribeToSync((syncing) => setIsSyncing(syncing));

    // Inicialização: se houver fila pendente, tenta descarregar e depois recarrega a nuvem
    offlineSyncManager.processQueue().then(() => {
      loadCloudData();
    });

    const handleOnline = () => {
      offlineSyncManager.processQueue().then(() => {
        loadCloudData();
      });
    };

    const handleFocus = () => {
      offlineSyncManager.checkRealConnection().catch(() => {});
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('focus', handleFocus);
    }

    const interval = setInterval(() => {
      offlineSyncManager.checkRealConnection().catch(() => {});
    }, 30000);

    return () => {
      unsubNet();
      unsubQueue();
      unsubSync();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('focus', handleFocus);
      }
      clearInterval(interval);
    };
  }, [loadCloudData]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
    } catch (e) {
      console.error('Error saving companies', e);
    }
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
    } catch (e) {
      console.error('Error saving branches', e);
    }
  }, [branches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
    } catch (e) {
      console.error('Error saving sellers', e);
    }
  }, [sellers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Error saving sales', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MONTHLY_HISTORY, JSON.stringify(monthlyHistory));
    } catch (e) {
      console.error('Error saving monthlyHistory', e);
    }
  }, [monthlyHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLER_ALIASES, JSON.stringify(sellerAliases));
    } catch (e) {
      console.error('Error saving sellerAliases', e);
    }
  }, [sellerAliases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPANY_ALIASES, JSON.stringify(companyAliases));
    } catch (e) {
      console.error('Error saving companyAliases', e);
    }
  }, [companyAliases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IMPORT_TEMPLATES, JSON.stringify(importTemplates));
    } catch (e) {
      console.error('Error saving importTemplates', e);
    }
  }, [importTemplates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IMPORT_AUDITS, JSON.stringify(importAudits));
    } catch (e) {
      console.error('Error saving importAudits', e);
    }
  }, [importAudits]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_SESSIONS, JSON.stringify(historicalSessions));
    } catch (e) {
      console.error('Error saving historicalSessions', e);
    }
  }, [historicalSessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MASTER_GOALS, JSON.stringify(masterGoals));
    } catch (e) {
      console.error('Error saving masterGoals', e);
    }
  }, [masterGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WEIGHT_TEMPLATES, JSON.stringify(weightTemplates));
    } catch (e) {
      console.error('Error saving weightTemplates', e);
    }
  }, [weightTemplates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GOAL_SIMULATIONS, JSON.stringify(goalSimulations));
    } catch (e) {
      console.error('Error saving goalSimulations', e);
    }
  }, [goalSimulations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AVAILABILITIES, JSON.stringify(availabilities));
    } catch (e) {
      console.error('Error saving availabilities', e);
    }
  }, [availabilities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKING_DAYS, JSON.stringify(workingDaysSettings));
    } catch (e) {
      console.error('Error saving workingDaysSettings', e);
    }
  }, [workingDaysSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, activeCompanyId);
    } catch (e) {
      console.error('Error saving active company', e);
    }
  }, [activeCompanyId]);

  // Ensure activeCompany is always valid
  const activeCompany = useMemo(() => {
    const found = companies.find((c) => c.id === activeCompanyId);
    return found || companies[0] || INITIAL_COMPANIES[0];
  }, [companies, activeCompanyId]);

  // Auto-healing: Garante que toda empresa cadastrada possua ao menos uma unidade (Matriz) e repara vínculos órfãos
  useEffect(() => {
    if (!Array.isArray(companies) || companies.length === 0) return;

    // 1. Garante que cada empresa tenha sua Matriz em branches
    setBranches((prevBranches) => {
      let hasChanges = false;
      const updated = [...prevBranches];

      companies.forEach((comp) => {
        const compBranches = updated.filter((b) => b.companyId === comp.id);
        if (compBranches.length === 0) {
          hasChanges = true;
          updated.push({
            id: `branch-${comp.id}-matriz`,
            companyId: comp.id,
            name: `${comp.tradeName || comp.name} - Matriz`,
            type: 'headquarters',
            active: true,
          });
        }
      });

      return hasChanges ? updated : prevBranches;
    });

    // 2. Garante que vendedores órfãos ou com branchId incompatível sejam re-vinculados à filial correta da empresa
    setSellers((prevSellers) => {
      if (!Array.isArray(prevSellers) || prevSellers.length === 0) return prevSellers;
      let hasChanges = false;
      const validCompanyIds = new Set(companies.map((c) => c.id));

      const updatedSellers = prevSellers.map((seller) => {
        let updated = { ...seller };

        // Se o vendedor não tem companyId válido, associa à empresa apropriada
        if (!seller.companyId || !validCompanyIds.has(seller.companyId)) {
          if (companies.length === 1) {
            updated.companyId = companies[0].id;
            hasChanges = true;
          } else if (activeCompanyId && validCompanyIds.has(activeCompanyId)) {
            updated.companyId = activeCompanyId;
            hasChanges = true;
          }
        }

        // Garante que o branchId do vendedor corresponda a uma filial válida da sua empresa
        const targetCompId = updated.companyId;
        const validBranches = branches.filter((b) => b.companyId === targetCompId);
        const branchExists = validBranches.some((b) => b.id === updated.branchId);

        if (!branchExists && validBranches.length > 0) {
          updated.branchId = validBranches[0].id;
          hasChanges = true;
        } else if (!updated.branchId) {
          updated.branchId = `branch-${targetCompId}-matriz`;
          hasChanges = true;
        }

        return updated;
      });

      return hasChanges ? updatedSellers : prevSellers;
    });
  }, [companies, branches, activeCompanyId]);

  // Sincroniza activeBranchId quando a empresa ativa mudar
  useEffect(() => {
    if (activeBranchId !== 'all') {
      const existsInCompany = branches.some(
        (b) => b.companyId === activeCompanyId && b.id === activeBranchId
      );
      if (!existsInCompany) {
        setActiveBranchId('all');
      }
    }
  }, [activeCompanyId, branches, activeBranchId]);

  // Monthly history for the active company
  // IMPORTANTE: cada empresa tem seu próprio histórico isolado.
  // Empresas novas retornam array vazio — sem contaminação de dados entre clientes.
  const companyMonthlyHistory = useMemo(() => {
    const hist = monthlyHistory[activeCompany.id];
    if (hist && hist.length > 0) return hist;
    // Se a empresa é a demo padrão, retorna o histórico demo; caso contrário, array vazio
    if (activeCompany.id === 'comp-otica-visao') {
      return INITIAL_MONTHLY_HISTORY['comp-otica-visao'] || [];
    }
    return []; // Nova empresa: histórico limpo, sem dados de outra empresa
  }, [monthlyHistory, activeCompany.id]);

  // Branches belonging to current company
  const companyBranches = useMemo(() => {
    if (!Array.isArray(branches) || !activeCompany?.id) return [];
    const filtered = branches.filter((b) => b.companyId === activeCompany.id);
    if (filtered.length > 0) return filtered;
    // Fallback defensivo: se não houver filial cadastrada, retorna filial virtual
    return [
      {
        id: `branch-${activeCompany.id}-matriz`,
        companyId: activeCompany.id,
        name: `${activeCompany.tradeName || activeCompany.name} - Matriz`,
        type: 'headquarters' as BranchType,
        active: true,
      },
    ];
  }, [branches, activeCompany?.id, activeCompany.tradeName, activeCompany.name]);

  // Sellers belonging to current company
  const companySellers = useMemo(() => {
    if (!Array.isArray(sellers) || !activeCompany?.id) return [];
    return sellers.filter((s) => s.companyId === activeCompany.id && s.active);
  }, [sellers, activeCompany?.id]);

  // Auto-consolidação defensiva de vendedores e filiais da empresa ativa
  useEffect(() => {
    if (!activeCompany?.id || !Array.isArray(sellers) || sellers.length === 0) return;
    
    // Todas as filiais da empresa ativa
    const currentCompanyBranches = branches.filter((b) => b.companyId === activeCompany.id);
    if (currentCompanyBranches.length === 0) return;

    // Se as filiais da empresa forem apenas matrizes duplicadas (ex: gerada pelo addCompany + onboarding)
    const isSingleStore = currentCompanyBranches.length <= 1 || currentCompanyBranches.every((b) => 
      b.type === 'headquarters' || b.name.toLowerCase().includes('matriz')
    );

    if (isSingleStore) {
      // Descobre a filial principal com mais vendedores
      const primaryBranch = currentCompanyBranches.reduce((best, curr) => {
        const bestCount = sellers.filter((s) => s.companyId === activeCompany.id && s.branchId === best.id).length;
        const currCount = sellers.filter((s) => s.companyId === activeCompany.id && s.branchId === curr.id).length;
        return currCount >= bestCount ? curr : best;
      }, currentCompanyBranches[0]);

      // Unifica todos os vendedores da empresa para a filial principal
      setSellers((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (s.companyId === activeCompany.id && s.branchId !== primaryBranch.id) {
            changed = true;
            const updated = { ...s, branchId: primaryBranch.id };
            safeSyncSeller(updated);
            return updated;
          }
          return s;
        });
        return changed ? next : prev;
      });

      // Remove a filial fantasma duplicada se houver mais de uma
      if (currentCompanyBranches.length > 1) {
        const duplicates = currentCompanyBranches.filter((b) => b.id !== primaryBranch.id);
        setBranches((prev) => prev.filter((b) => !duplicates.some((d) => d.id === b.id)));
        duplicates.forEach((d) => deleteBranchFromSupabase(d.id));
      }
    }
  }, [activeCompany?.id, branches, sellers]);

  // Sales belonging to current company
  const companySales = useMemo(() => {
    if (!Array.isArray(sales) || !activeCompany?.id) return [];
    return sales.filter((s) => s.companyId === activeCompany.id);
  }, [sales, activeCompany?.id]);

  // Filtered sales based on branch, seller, period
  const filteredSales = useMemo(() => {
    if (!Array.isArray(companySales)) return [];
    return companySales.filter((sale) => {
      if (activeBranchId !== 'all' && sale.branchId !== activeBranchId) return false;
      if (activeSellerId !== 'all' && sale.sellerId !== activeSellerId) return false;
      if (activePeriodType !== sale.periodType) return false;
      if (activePeriodNumber !== 'all' && sale.periodNumber !== activePeriodNumber) return false;
      return true;
    });
  }, [companySales, activeBranchId, activeSellerId, activePeriodType, activePeriodNumber]);

  // Helper para obter a meta desdobrada do vendedor para um registro de venda específico
  const getSellerTargetForSale = (sale: SaleRecord): number => {
    const year = sale.year || 2026;
    let monthNumber = 1;
    let weekIndex = 0;
    
    if (sale.periodType === 'weekly') {
      const weekNum = sale.periodNumber;
      if (weekNum >= 1 && weekNum <= 4) {
        monthNumber = 1;
        weekIndex = weekNum - 1;
      } else if (weekNum >= 5 && weekNum <= 8) {
        monthNumber = 2;
        weekIndex = weekNum - 5;
      } else if (weekNum >= 9 && weekNum <= 12) {
        monthNumber = 3;
        weekIndex = weekNum - 9;
      } else {
        monthNumber = Math.ceil(weekNum / 4);
        weekIndex = (weekNum - 1) % 4;
      }
    } else {
      monthNumber = sale.periodNumber;
    }
    
    const key = `${sale.companyId}-${sale.branchId}-${year}-${monthNumber}`;
    const mGoal = masterGoals[key];
    const seller = sellers.find((s) => s.id === sale.sellerId);
    const share = seller?.officialSharePercentage ?? 25;
    
    if (mGoal) {
      if (sale.periodType === 'weekly' && mGoal.weeks && mGoal.weeks[weekIndex]) {
        const weekRevTarget = mGoal.weeks[weekIndex].revenueTarget ?? 0;
        return Math.round(weekRevTarget * (share / 100));
      } else {
        return Math.round(mGoal.monthlyTarget * (share / 100));
      }
    }
    
    return sale.target || (activeCompany.levels[0]?.revenueTarget ?? 30000);
  };

  // Calculation helper for a specific sale record
  const getSellerCalculation = (sale: SaleRecord): CalculationResult => {
    const dynamicTarget = getSellerTargetForSale(sale);
    return calculateSalePerformance(
      sale.revenue,
      activeCompany.levels,
      activeCompany.numberOfLevels,
      activeCompany.financialSettings,
      dynamicTarget
    );
  };

  // Generate automated alerts
  const alerts: SystemAlert[] = useMemo(() => {
    const generated: SystemAlert[] = [];
    const safeCompanySales = Array.isArray(companySales) ? companySales : [];
    const latestSales = safeCompanySales.filter(
      (s) => s.periodNumber === 12 && s.periodType === 'weekly'
    );

    latestSales.forEach((sale) => {
      const seller = sellers.find((s) => s.id === sale.sellerId);
      const branch = branches.find((b) => b.id === sale.branchId);
      const perf = getSellerCalculation(sale);

      // Alert: Low performance (<70% of Meta 1)
      if (perf.achievementPercentage < 70) {
        generated.push({
          id: `alert-low-${sale.id}`,
          type: 'danger',
          category: 'performance',
          title: 'Atenção de Desempenho',
          message: `${seller?.name || 'Vendedor'} está com apenas ${perf.achievementPercentage.toFixed(1)}% da Meta 1 no período atual.`,
          sellerName: seller?.name,
          branchName: branch?.name,
          metricValue: `${perf.achievementPercentage.toFixed(1)}%`,
          timestamp: 'Recente',
        });
      }

      // Alert: Near next goal (gap < R$ 2.500)
      if (perf.nextLevelTarget && perf.gapToNextLevel > 0 && perf.gapToNextLevel <= 2500) {
        const nextLvlName = `Meta ${perf.achievedLevel + 1}`;
        generated.push({
          id: `alert-near-${sale.id}`,
          type: 'warning',
          category: 'near_goal',
          title: 'Próximo Nível ao Alcance',
          message: `Faltam apenas R$ ${perf.gapToNextLevel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${seller?.name || 'Vendedor'} atingir a ${nextLvlName}!`,
          sellerName: seller?.name,
          branchName: branch?.name,
          metricValue: `+R$ ${perf.potentialCommissionGain?.toLocaleString('pt-BR') || 0} comissão`,
          timestamp: 'Recente',
        });
      }

      // Alert: Goal reached (level >= 2)
      if (perf.achievedLevel >= 2) {
        generated.push({
          id: `alert-reached-${sale.id}`,
          type: 'success',
          category: 'goal_reached',
          title: 'Meta Batida com Sucesso',
          message: `${seller?.name || 'Vendedor'} superou a ${perf.achievedLevelName} com faturamento de R$ ${sale.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}!`,
          sellerName: seller?.name,
          branchName: branch?.name,
          metricValue: perf.achievedLevelName,
          timestamp: 'Recente',
        });
      }
    });

    // Rentability alert: verify if highest level commission creates low incremental margin
    const activeLevels = getActiveLevels(activeCompany.levels, activeCompany.numberOfLevels);
    if (activeLevels.length >= 2) {
      const topLevel = activeLevels[activeLevels.length - 1];
      const prevLevel = activeLevels[activeLevels.length - 2];
      const revDiff = topLevel.revenueTarget - prevLevel.revenueTarget;
      const topCosts =
        topLevel.revenueTarget *
        ((activeCompany.financialSettings.cmvPercentage +
          activeCompany.financialSettings.taxPercentage +
          activeCompany.financialSettings.cardFeePercentage +
          topLevel.commissionPercentage) /
          100);
      const prevCosts =
        prevLevel.revenueTarget *
        ((activeCompany.financialSettings.cmvPercentage +
          activeCompany.financialSettings.taxPercentage +
          activeCompany.financialSettings.cardFeePercentage +
          prevLevel.commissionPercentage) /
          100);
      const incMargin = topLevel.revenueTarget - topCosts - (prevLevel.revenueTarget - prevCosts);
      const incMarginPct = revDiff > 0 ? (incMargin / revDiff) * 100 : 0;

      if (incMarginPct < 15 && incMarginPct > 0) {
        generated.push({
          id: 'alert-rentability-warning',
          type: 'warning',
          category: 'profitability',
          title: 'Alerta de Rentabilidade FP&A',
          message: `A transição da ${prevLevel.name} para a ${topLevel.name} gera apenas ${incMarginPct.toFixed(1)}% de margem incremental devido ao salto da comissão (${topLevel.commissionPercentage}%).`,
          timestamp: 'Análise Estrutural',
        });
      }
    }

    return generated.filter((a) => !dismissedAlertIds.includes(a.id));
  }, [companySales, sellers, branches, activeCompany, dismissedAlertIds]);

  const dismissAlert = (id: string) => {
    setDismissedAlertIds((prev) => [...prev, id]);
  };

  // CRUD Implementations
  const addCompany = (companyData: (Omit<Company, 'id' | 'createdAt'> & { id?: string; createdAt?: string })): string => {
    const id = companyData.id || `comp-${Date.now()}`;
    const newCompany: Company = {
      ...companyData,
      id,
      createdAt: companyData.createdAt || new Date().toISOString(),
    };
    setCompanies((prev) => [...prev, newCompany]);
    safeSyncCompany(newCompany);

    // Garante que a matriz seja criada imediatamente para esta nova empresa
    const matrizBranch: Branch = {
      id: `branch-${id}-matriz`,
      companyId: id,
      name: `${newCompany.tradeName || newCompany.name} - Matriz`,
      type: 'headquarters',
      active: true,
    };

    setBranches((prev) => {
      const exists = prev.some((b) => b.companyId === id);
      if (!exists) {
        return [...prev, matrizBranch];
      }
      return prev;
    });
    safeSyncBranch(matrizBranch);

    setActiveCompanyId(id);
    return id;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          safeSyncCompany(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteCompany = (id: string) => {
    if (companies.length <= 1) {
      alert('Não é possível excluir a única empresa cadastrada.');
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setBranches((prev) => prev.filter((b) => b.companyId !== id));
    setSellers((prev) => prev.filter((s) => s.companyId !== id));
    setSales((prev) => prev.filter((s) => s.companyId !== id));
    safeDeleteCompany(id);
    const remaining = companies.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      setActiveCompanyId(remaining[0].id);
    }
  };

  const addBranch = (branchData: (Omit<Branch, 'id'> & { id?: string })): string => {
    const id = branchData.id || `branch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newBranch: Branch = { ...branchData, id };
    setBranches((prev) => [...prev, newBranch]);
    safeSyncBranch(newBranch);
    return id;
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updated = { ...b, ...updates };
          safeSyncBranch(updated);
          return updated;
        }
        return b;
      })
    );
  };

  const deleteBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    safeDeleteBranch(id);
  };

  const addSeller = (sellerData: (Omit<Seller, 'id'> & { id?: string })): string => {
    const id = sellerData.id || `seller-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSeller: Seller = { ...sellerData, id };
    setSellers((prev) => [...prev, newSeller]);
    safeSyncSeller(newSeller);
    return id;
  };

  const batchAddSellers = (newSellersData: Omit<Seller, 'id'>[]): number => {
    if (!newSellersData || newSellersData.length === 0) return 0;
    const timestamp = Date.now();
    const createdList: Seller[] = newSellersData.map((data, index) => ({
      ...data,
      id: `seller-${timestamp}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    }));
    setSellers((prev) => [...prev, ...createdList]);
    createdList.forEach((s) => safeSyncSeller(s));
    return createdList.length;
  };

  const updateSeller = (id: string, updates: Partial<Seller>) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          safeSyncSeller(updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSeller = (id: string) => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
    safeDeleteSeller(id);
  };

  const addSale = (saleData: Omit<SaleRecord, 'id' | 'createdAt'>): string => {
    const id = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newSale: SaleRecord = {
      ...saleData,
      id,
      createdAt: new Date().toISOString(),
    };
    setSales((prev) => [...prev, newSale]);
    safeSyncSale(newSale);
    return id;
  };

  const updateSale = (id: string, updates: Partial<SaleRecord>) => {
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          safeSyncSale(updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
    safeDeleteSale(id);
  };

  const batchAddSales = (newSales: Omit<SaleRecord, 'id' | 'createdAt'>[]): number => {
    const now = new Date().toISOString();
    const created: SaleRecord[] = newSales.map((s, idx) => ({
      ...s,
      id: `sale-import-${Date.now()}-${idx}`,
      createdAt: now,
    }));
    setSales((prev) => [...prev, ...created]);
    created.forEach((s) => safeSyncSale(s));
    return created.length;
  };

  const updateMonthlyRecord = (
    companyId: string,
    monthNumber: number,
    year: number,
    updates: Partial<MonthlyHistoricalRecord>
  ) => {
    setMonthlyHistory((prev) => {
      const companyHist = prev[companyId] || INITIAL_MONTHLY_HISTORY[companyId] || [];
      const updated = companyHist.map((m) =>
        m.monthNumber === monthNumber && m.year === year ? { ...m, ...updates } : m
      );
      return { ...prev, [companyId]: updated };
    });
  };

  const applySuggestedGoals = (newLevels: GoalLevel[]) => {
    updateCompany(activeCompany.id, {
      levels: newLevels,
      numberOfLevels: newLevels.length,
    });
  };

  const saveSellerAlias = (companyId: string, sellerId: string, sourceName: string) => {
    const norm = normalizeText(sourceName);
    setSellerAliases((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.companyId === companyId && a.normalizedName === norm
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          sellerId,
          sourceName,
          normalizedName: norm,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `alias-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          companyId,
          sellerId,
          sourceName,
          normalizedName: norm,
        },
      ];
    });
  };

  const deleteSellerAlias = (id: string) => {
    setSellerAliases((prev) => prev.filter((a) => a.id !== id));
  };

  const saveCompanyAlias = (companyId: string, branchId: string, sourceName: string) => {
    const norm = normalizeText(sourceName);
    setCompanyAliases((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.normalizedName === norm
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          companyId,
          branchId,
          sourceName,
          normalizedName: norm,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `comp-alias-${Date.now()}`,
          companyId,
          branchId,
          sourceName,
          normalizedName: norm,
        },
      ];
    });
  };

  const deleteCompanyAlias = (id: string) => {
    setCompanyAliases((prev) => prev.filter((a) => a.id !== id));
  };

  const saveImportTemplate = (template: ImportTemplate) => {
    setImportTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = template;
        return updated;
      }
      return [...prev, template];
    });
  };

  const deleteImportTemplate = (id: string) => {
    setImportTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const addImportAudit = (audit: ImportAuditRecord) => {
    setImportAudits((prev) => [audit, ...prev]);
  };

  const confirmSmartImport = (payload: SmartImportPayload): { importedSalesCount: number; periodNumber: number } => {
    const targetCompanyId = payload.header.matchedCompanyId || activeCompanyId;
    const targetBranchId = payload.header.matchedBranchId || (branches.find((b) => b.companyId === targetCompanyId)?.id || 'branch-default');
    
    // Calcula o número da semana a partir da data de início ou usa 32 como padrão para agosto
    let periodNum = 32;
    let year = 2026;
    if (payload.header.startDate) {
      const parts = payload.header.startDate.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10) || 2026;
        const month = parseInt(parts[1], 10) || 8;
        const day = parseInt(parts[2], 10) || 8;
        // Aproximação de semana do ano
        const dayOfYear = (month - 1) * 30.5 + day;
        periodNum = Math.min(52, Math.max(1, Math.ceil(dayOfYear / 7)));
      }
    }

    const newSalesToCreate: SaleRecord[] = [];
    const updatedSellers = [...sellers];

    payload.sellers.forEach((sellerRow, idx) => {
      let finalSellerId = sellerRow.matchedSellerId;

      // Se o vendedor ainda não tem ID associado, busca por nome ou cria
      if (!finalSellerId) {
        const existing = updatedSellers.find(
          (s) => s.companyId === targetCompanyId && normalizeText(s.name) === normalizeText(sellerRow.originalName)
        );
        if (existing) {
          finalSellerId = existing.id;
        } else {
          // Cria novo vendedor
          finalSellerId = `seller-auto-${Date.now()}-${idx}`;
          const newSeller: Seller = {
            id: finalSellerId,
            companyId: targetCompanyId,
            branchId: targetBranchId,
            name: sellerRow.originalName.trim(),
            role: 'Consultora de Vendas',
            active: true,
            startDate: payload.header.startDate || `${year}-01-01`,
            weeklyTarget: 35000,
            monthlyTarget: 140000,
          };
          updatedSellers.push(newSeller);
        }

        // Salva alias para aprendizado de máquina contínuo
        saveSellerAlias(targetCompanyId, finalSellerId, sellerRow.originalName);
      }

      // Adiciona alias se o nome fonte for diferente
      if (finalSellerId && sellerRow.originalName) {
        saveSellerAlias(targetCompanyId, finalSellerId, sellerRow.originalName);
      }

      // Cria registro de venda
      newSalesToCreate.push({
        id: `sale-smart-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        companyId: targetCompanyId,
        branchId: targetBranchId,
        sellerId: finalSellerId,
        periodType: 'weekly',
        year,
        periodNumber: periodNum,
        periodLabel: payload.header.periodLabel || `Semana ${periodNum.toString().padStart(2, '0')}`,
        startDate: payload.header.startDate || `${year}-08-08`,
        endDate: payload.header.endDate || `${year}-08-14`,
        revenue: sellerRow.revenue,
        salesCount: sellerRow.salesCount,
        paymentBreakdown: sellerRow.payments,
        target: 35000,
        importId: payload.id,
        createdAt: new Date().toISOString(),
      });
    });

    // Atualiza vendedores se houver novos
    if (updatedSellers.length !== sellers.length) {
      setSellers(updatedSellers);
    }

    // Grava as vendas no estado
    setSales((prev) => {
      // Remove vendas antigas desse mesmo importId se já existiam
      const filtered = prev.filter((s) => s.importId !== payload.id);
      return [...filtered, ...newSalesToCreate];
    });

    // Salva alias da empresa se identificado
    if (payload.header.companyName) {
      saveCompanyAlias(targetCompanyId, targetBranchId, payload.header.companyName);
    }

    // Registra na auditoria
    const auditRecord: ImportAuditRecord = {
      id: `audit-${Date.now()}`,
      fileName: payload.header.fileName || payload.header.companyName || 'Relatório de Vendas',
      importedAt: new Date().toISOString(),
      companyId: targetCompanyId,
      branchId: targetBranchId,
      periodLabel: payload.header.periodLabel || `Semana ${periodNum}`,
      startDate: payload.header.startDate || `${year}-08-08`,
      endDate: payload.header.endDate || `${year}-08-14`,
      sellersCount: payload.sellers.length,
      totalRevenue: payload.totals.reportedTotalRevenue || payload.totals.sumSellersRevenue,
      confidenceScore: payload.confidence.score,
      status: 'active',
      rawDocumentText: payload.rawText,
      payload: payload,
    };
    setImportAudits((prev) => [auditRecord, ...prev]);

    // Atualiza visão para a empresa e período importados
    setActiveCompanyId(targetCompanyId);
    setActiveBranchId(targetBranchId);
    setActivePeriodNumber(periodNum);

    return {
      importedSalesCount: newSalesToCreate.length,
      periodNumber: periodNum,
    };
  };

  const reprocessAudit = (auditId: string): SmartImportPayload | null => {
    const audit = importAudits.find((a) => a.id === auditId);
    if (!audit || !audit.payload) return null;
    return audit.payload;
  };

  const saveHistoricalSession = (session: HistoricalImportSession) => {
    setHistoricalSessions((prev) => ({
      ...prev,
      [session.id]: session,
    }));
  };

  const deleteHistoricalSession = (sessionId: string) => {
    setHistoricalSessions((prev) => {
      const copy = { ...prev };
      delete copy[sessionId];
      return copy;
    });
  };

  const commitHistoricalSessionToOfficial = (
    session: HistoricalImportSession
  ): { monthlyCount: number; salesCount: number; sellersCount: number } => {
    const targetCompanyId = session.companyId;

    // 1. Compila os dados consolidados usando o motor
    const companyBranchesList = branches.filter((b) => b.companyId === targetCompanyId);
    const companySellersList = sellers.filter((s) => s.companyId === targetCompanyId);

    const { newMonthlyHistory, newSalesRecords, newSellers } = buildOfficialDatabaseCommit(
      {
        companyId: targetCompanyId,
        stagingRecords: session.stagingRecords,
        coverage: session.coverage,
      },
      companyBranchesList,
      companySellersList
    );

    // 2. Atualiza o histórico mensal da empresa no AppContext
    setMonthlyHistory((prev) => ({
      ...prev,
      [targetCompanyId]: newMonthlyHistory,
    }));

    // 3. Cadastra novos vendedores descobertos
    let createdSellersCount = 0;
    if (newSellers.length > 0) {
      setSellers((prev) => {
        const nextSellers = [...prev];
        for (const s of newSellers) {
          const sId = `seller-hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          nextSellers.push({
            id: sId,
            ...s,
          });
          createdSellersCount++;
          // Registra alias
          saveSellerAlias(targetCompanyId, sId, s.name);
        }
        return nextSellers;
      });
    }

    // 4. Cria os registros detalhados de vendas
    if (newSalesRecords.length > 0) {
      setSales((prev) => {
        // Remove vendas antigas importadas dessa mesma sessão se já existiam
        const filtered = prev.filter((s) => s.companyId !== targetCompanyId || !s.notes?.includes('Importação Histórica'));
        const newSales: SaleRecord[] = newSalesRecords.map((r, idx) => ({
          id: `sale-hist-${Date.now()}-${idx}`,
          companyId: r.companyId,
          branchId: r.branchId,
          sellerId: r.sellerId,
          periodType: r.periodType,
          year: r.year,
          periodNumber: r.periodNumber,
          periodLabel: r.periodLabel,
          startDate: r.startDate,
          endDate: r.endDate,
          revenue: r.revenue,
          target: r.target,
          salesCount: r.salesCount,
          paymentBreakdown: r.paymentBreakdown,
          notes: r.notes,
          createdAt: new Date().toISOString(),
        }));
        return [...filtered, ...newSales];
      });
    }

    // 5. Marca a sessão como confirmada
    saveHistoricalSession({
      ...session,
      status: 'step5_confirmed',
      updatedAt: new Date().toISOString(),
    });

    // 6. Atualiza empresa ativa e visão
    setActiveCompanyId(targetCompanyId);
    setActivePeriodType('monthly');

    return {
      monthlyCount: newMonthlyHistory.length,
      salesCount: newSalesRecords.length,
      sellersCount: createdSellersCount,
    };
  };

  // Helper para buscar ou gerar Master Goal de um período
  const getMasterGoalForPeriod = (
    companyId: string,
    branchId: string,
    year: number,
    monthNumber: number
  ): MonthlyMasterGoal => {
    const key = `${companyId}-${branchId}-${year}-${monthNumber}`;
    if (masterGoals[key]) {
      return masterGoals[key];
    }

    // Fallback: se branchId for 'all', tenta pegar a primeira filial
    const targetBranch = branches.find((b) => b.id === branchId && b.companyId === companyId) ||
      branches.find((b) => b.companyId === companyId) ||
      branches[0];

    const fallbackBranchId = targetBranch ? targetBranch.id : branchId;
    const fallbackKey = `${companyId}-${fallbackBranchId}-${year}-${monthNumber}`;

    if (masterGoals[fallbackKey]) {
      return masterGoals[fallbackKey];
    }

    const branchName = targetBranch ? targetBranch.name : 'Unidade Principal';
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[monthNumber - 1] || `Mês ${monthNumber}`;
    const targetCompany = companies.find((c) => c.id === companyId);
    const defaultMonthlyTarget = targetCompany?.levels[0]?.revenueTarget || 0;
    const defaultWeights = [15, 20, 25, 40];

    return {
      id: `goal-${companyId}-${fallbackBranchId}-${year}-${monthNumber}`,
      companyId,
      branchId: fallbackBranchId,
      branchName,
      year,
      monthNumber,
      monthName,
      monthlyTarget: defaultMonthlyTarget,
      numberOfWeeks: 4,
      weeks: buildCommercialWeeks(year, monthNumber, 4, defaultWeights, defaultMonthlyTarget),
      totalWeight: 100,
      isValid: true,
      templateUsed: 'Início fraco (4 semanas)',
      commissionRuleType: 'monthly',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
  };

  // Master goal ativa do período de trabalho atual (Setembro/2026)
  const activeMasterGoal = useMemo(() => {
    const targetBranchId = activeBranchId !== 'all' ? activeBranchId : (companyBranches[0]?.id || 'branch-matriz');
    return getMasterGoalForPeriod(activeCompanyId, targetBranchId, 2026, 9);
  }, [activeCompanyId, activeBranchId, companyBranches, masterGoals]);

  const saveMasterGoal = (goal: MonthlyMasterGoal) => {
    const key = `${goal.companyId}-${goal.branchId}-${goal.year}-${goal.monthNumber}`;
    setMasterGoals((prev) => ({
      ...prev,
      [key]: {
        ...goal,
        updatedAt: new Date().toISOString(),
      },
    }));
    safeSyncMasterGoal(goal);
  };

  /**
   * applyMonthlyTargetToAllBranches
   * Chamada pelas Configurações da Empresa para criar/atualizar MonthlyMasterGoal
   * em todas as filiais da empresa ativa, sincronizando com Dashboard, Comissões e Vendedores.
   */
  const applyMonthlyTargetToAllBranches = (
    monthlyTarget: number,
    monthNumber: number,
    year: number
  ) => {
    const MONTH_NAMES = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const monthName = MONTH_NAMES[monthNumber - 1];
    const targetBranches = branches.filter((b) => b.companyId === activeCompanyId);

    setMasterGoals((prev) => {
      const next = { ...prev };
      targetBranches.forEach((branch) => {
        const key = `${activeCompanyId}-${branch.id}-${year}-${monthNumber}`;
        const existing = prev[key];
        // Mantém semanas existentes se já tiver sido configurado no Gerador
        // mas atualiza o monthlyTarget e recalcula revenueTarget de cada semana
        let updatedWeeks = existing?.weeks;
        if (!updatedWeeks || updatedWeeks.length === 0) {
          updatedWeeks = buildCommercialWeeks(year, monthNumber, 4, [15, 20, 25, 40], monthlyTarget);
        } else {
          // Recalcula revenueTarget mantendo os pesos existentes
          updatedWeeks = updatedWeeks.map((w) => ({
            ...w,
            revenueTarget: Math.round(monthlyTarget * (w.weightPercentage / 100)),
            targetAmount: Math.round(monthlyTarget * (w.weightPercentage / 100)),
          }));
        }

        const updatedGoal = {
          id: existing?.id || `goal-${activeCompanyId}-${branch.id}-${year}-${monthNumber}`,
          companyId: activeCompanyId,
          branchId: branch.id,
          branchName: branch.name,
          year,
          monthNumber,
          monthName,
          monthlyTarget,
          numberOfWeeks: updatedWeeks.length as 4 | 5,
          weeks: updatedWeeks,
          totalWeight: updatedWeeks.reduce((acc, w) => acc + w.weightPercentage, 0),
          isValid: true,
          commissionRuleType: 'monthly' as const,
          status: (existing?.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
          updatedAt: new Date().toISOString(),
          publishedAt: existing?.publishedAt,
        };
        next[key] = updatedGoal;
        safeSyncMasterGoal(updatedGoal);
      });
      return next;
    });
  };

  const publishMasterGoal = (goalOrId: string | MonthlyMasterGoal): boolean => {
    let goalToPublish: MonthlyMasterGoal | undefined;
    let key: string | undefined;

    if (typeof goalOrId === 'object' && goalOrId !== null) {
      goalToPublish = goalOrId;
      key = `${goalToPublish.companyId}-${goalToPublish.branchId}-${goalToPublish.year}-${goalToPublish.monthNumber}`;
    } else {
      const entries = Object.entries(masterGoals) as [string, MonthlyMasterGoal][];
      const targetEntry = entries.find(([, g]) => g.id === goalOrId);
      if (targetEntry) {
        [key, goalToPublish] = targetEntry;
      }
    }

    if (!goalToPublish || !key) return false;

    const publishedGoal: MonthlyMasterGoal = {
      ...goalToPublish,
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva a meta publicada
    setMasterGoals((prev) => ({
      ...prev,
      [key!]: publishedGoal,
    }));
    safeSyncMasterGoal(publishedGoal);

    // 2. Sincroniza as metas dos vendedores da filial para refletir a nova meta mensal e semanal
    const branchSellers = sellers.filter(
      (s) =>
        s.companyId === publishedGoal.companyId &&
        (publishedGoal.branchId === 'all' || s.branchId === publishedGoal.branchId || companyBranches.length <= 1) &&
        s.active
    );

    if (branchSellers.length > 0) {
      setSellers((prev) =>
        prev.map((s) => {
          const belongsToGoal =
            s.companyId === publishedGoal.companyId &&
            (publishedGoal.branchId === 'all' || s.branchId === publishedGoal.branchId || companyBranches.length <= 1) &&
            s.active;
          if (belongsToGoal) {
            const share = s.officialSharePercentage || (100 / branchSellers.length);
            const sellerMonthlyTarget = Math.round(publishedGoal.monthlyTarget * (share / 100));
            const sellerWeeklyTarget = Math.round(sellerMonthlyTarget / (publishedGoal.numberOfWeeks || 4));
            const updatedSeller = {
              ...s,
              monthlyTarget: sellerMonthlyTarget,
              weeklyTarget: sellerWeeklyTarget,
            };
            safeSyncSeller(updatedSeller);
            return updatedSeller;
          }
          return s;
        })
      );
    }

    // 3. Atualiza os níveis de meta da empresa proporcionalmente à nova meta base (Nível 1)
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id === publishedGoal.companyId) {
          let updatedLevels = c.levels;
          if (publishedGoal.levels && publishedGoal.levels.length > 0) {
            updatedLevels = publishedGoal.levels;
          } else {
            const oldBase = c.levels[0]?.revenueTarget || 1;
            updatedLevels = c.levels.map((lvl, idx) => {
              if (idx === 0) {
                return { ...lvl, revenueTarget: publishedGoal.monthlyTarget };
              }
              const ratio = lvl.revenueTarget / oldBase;
              return {
                ...lvl,
                revenueTarget: Math.round(publishedGoal.monthlyTarget * (ratio > 1 ? ratio : 1 + idx * 0.2)),
              };
            });
          }
          return {
            ...c,
            levels: updatedLevels,
            levelGrowthPercentages: publishedGoal.levelGrowthPercentages || c.levelGrowthPercentages,
          };
        }
        return c;
      })
    );

    // 4. Atualiza as metas nos registros de vendas do período correspondente
    setSales((prev) =>
      prev.map((sale) => {
        if (
          sale.companyId === publishedGoal.companyId &&
          (publishedGoal.branchId === 'all' || sale.branchId === publishedGoal.branchId) &&
          sale.year === publishedGoal.year &&
          sale.periodNumber === publishedGoal.monthNumber
        ) {
          const matchedSeller = sellers.find((s) => s.id === sale.sellerId);
          const share = matchedSeller?.officialSharePercentage || (branchSellers.length > 0 ? 100 / branchSellers.length : 100);
          const sellerMonthlyTarget = Math.round(publishedGoal.monthlyTarget * (share / 100));
          return {
            ...sale,
            target: sellerMonthlyTarget,
          };
        }
        return sale;
      })
    );

    return true;
  };

  const saveWeightTemplate = (template: WeeklyWeightTemplate) => {
    setWeightTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = template;
        return copy;
      }
      return [...prev, template];
    });
  };

  const deleteWeightTemplate = (templateId: string) => {
    setWeightTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const saveGoalSimulation = (sim: GoalSimulationScenario) => {
    setGoalSimulations((prev) => {
      const idx = prev.findIndex((s) => s.id === sim.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = sim;
        return copy;
      }
      return [sim, ...prev];
    });
  };

  const deleteGoalSimulation = (simId: string) => {
    setGoalSimulations((prev) => prev.filter((s) => s.id !== simId));
  };

  const applyGoalSimulationAsOfficial = (sim: GoalSimulationScenario) => {
    // 1. Cria ou atualiza Master Goal oficial
    const existing = getMasterGoalForPeriod(sim.companyId, sim.branchId, sim.year, sim.monthNumber);
    const updatedMaster: MonthlyMasterGoal = {
      ...existing,
      monthlyTarget: sim.simulatedMonthlyTarget,
      weeks: sim.simulatedWeeks,
      numberOfWeeks: sim.simulatedWeeks.length as 4 | 5,
      totalWeight: sim.simulatedWeeks.reduce((acc, w) => acc + w.weightPercentage, 0),
      isValid: true,
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMasterGoal(updatedMaster);

    // 2. Se a simulação tem vendedores alterados, aplica a participação e novas metas
    if (sim.simulatedSellers && sim.simulatedSellers.length > 0) {
      setSellers((prev) =>
        prev.map((seller) => {
          const matched = sim.simulatedSellers?.find((sd) => sd.sellerId === seller.id);
          if (matched) {
            return {
              ...seller,
              officialSharePercentage: matched.simulatedShare,
              monthlyTarget: matched.simulatedMonthlyTarget,
              weeklyTarget: Math.round(matched.simulatedMonthlyTarget / sim.simulatedWeeks.length),
              shareOriginType: 'adjusted',
            };
          }
          return seller;
        })
      );
    }
  };

  const updateSellerShare = (
    sellerId: string,
    share: number,
    originType: 'historical' | 'manual' | 'adjusted' = 'manual'
  ) => {
    setSellers((prev) =>
      prev.map((s) => {
        if (s.id === sellerId) {
          return {
            ...s,
            officialSharePercentage: share,
            shareOriginType: originType,
          };
        }
        return s;
      })
    );
  };



  const getSellerGoalDetail = (
    sellerId: string,
    monthNumber: number = 9,
    year: number = 2026
  ): SellerGoalDetail | null => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return null;

    const masterGoal = getMasterGoalForPeriod(seller.companyId, seller.branchId, year, monthNumber);
    const unitSales = Array.isArray(sales)
      ? sales.filter((s) => {
          if (s.companyId !== seller.companyId) return false;
          if (s.year && s.year !== year) return false;
          let saleMonth = (s as any).monthNumber;
          if (!saleMonth && s.periodType === 'weekly' && s.periodNumber) {
            saleMonth = Math.min(12, Math.ceil(s.periodNumber / 4));
          } else if (!saleMonth && s.periodType === 'monthly' && s.periodNumber) {
            saleMonth = s.periodNumber;
          } else if (!saleMonth && s.startDate) {
            const parts = s.startDate.split('-');
            if (parts.length >= 2) saleMonth = parseInt(parts[1], 10);
          }
          if (!saleMonth) return monthNumber === 9;
          return saleMonth === monthNumber;
        })
      : [];
    const unitSellers = Array.isArray(sellers)
      ? sellers.filter((s) => s.companyId === seller.companyId && s.branchId === seller.branchId && s.active)
      : [];

    return calculateSellerGoalDetail(
      seller,
      masterGoal,
      unitSales,
      unitSellers,
      availabilities,
      workingDaysSettings
    );
  };

  const getTeamParticipation = (branchId?: string, customMonthlyTarget?: number): TeamParticipationSummary => {
    const targetBranchId = branchId || (activeBranchId !== 'all' ? activeBranchId : (companyBranches[0]?.id || 'branch-matriz'));
    const targetValue = typeof customMonthlyTarget === 'number' ? customMonthlyTarget : activeMasterGoal.monthlyTarget;
    // Isolamento estrito: passa apenas os vendedores pertencentes à empresa ativa
    return validateTeamParticipation(companySellers, targetBranchId, companySales, targetValue);
  };

  const addAvailability = (item: Omit<SellerAvailability, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: SellerAvailability = {
      ...item,
      id: `avail-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAvailabilities((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateAvailability = (id: string, updates: Partial<SellerAvailability>) => {
    setAvailabilities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a))
    );
  };

  const deleteAvailability = (id: string) => {
    setAvailabilities((prev) => prev.filter((a) => a.id !== id));
  };

  const updateWorkingDaysSettings = (settings: WorkingDaysSettings) => {
    setWorkingDaysSettings(settings);
  };

  const calculateAvailabilityRedistributionHelper = (
    companyId: string,
    branchId: string,
    year: number,
    monthNumber: number,
    overrideMethod?: AvailabilityRedistributionMethod,
    manualAllocations?: Record<string, number>
  ): AvailabilityRedistributionResult => {
    const masterGoalKey = `${companyId}-${branchId}-${year}-${monthNumber}`;
    const mGoal = masterGoals[masterGoalKey];
    const unitTarget = mGoal ? mGoal.monthlyTarget : (activeCompany.levels[0]?.revenueTarget || 0);
    const weeks = mGoal?.weeks || buildCommercialWeeks(year, monthNumber, 4, [15, 20, 25, 40], unitTarget);

    return calculateAvailabilityRedistribution(
      companyId,
      branchId,
      year,
      monthNumber,
      unitTarget,
      weeks,
      companySellers,
      availabilities,
      workingDaysSettings,
      overrideMethod,
      manualAllocations,
      true,
      activeCompany.levels
    );
  };

  const autoRedistributeTeamParticipation = (
    branchId: string,
    changedSellerId: string,
    newShare: number
  ) => {
    const branchSellers = sellers.filter(
      (s) =>
        s.companyId === activeCompanyId &&
        (branchId === 'all' || s.branchId === branchId || companyBranches.length <= 1) &&
        s.active
    );

    const inputList = branchSellers.map((s) => ({
      sellerId: s.id,
      officialSharePercentage: s.officialSharePercentage ?? (100 / Math.max(1, branchSellers.length)),
    }));

    const redistributed = redistributeTeamShares(inputList, changedSellerId, newShare);

    setSellers((prev) =>
      prev.map((s) => {
        const updated = redistributed.find((r) => r.sellerId === s.id);
        if (updated) {
          const newSellerObj = {
            ...s,
            officialSharePercentage: updated.officialSharePercentage,
            shareOriginType: s.id === changedSellerId ? 'manual' : (s.shareOriginType || 'adjusted'),
          };
          safeSyncSeller(newSellerObj);
          return newSellerObj;
        }
        return s;
      })
    );
  };

  const resetToDefaultData = () => {
    localStorage.removeItem(STORAGE_KEYS.COMPANIES);
    localStorage.removeItem(STORAGE_KEYS.BRANCHES);
    localStorage.removeItem(STORAGE_KEYS.SELLERS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.MONTHLY_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_COMPANY);
    localStorage.removeItem(STORAGE_KEYS.SELLER_ALIASES);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_ALIASES);
    localStorage.removeItem(STORAGE_KEYS.IMPORT_TEMPLATES);
    localStorage.removeItem(STORAGE_KEYS.IMPORT_AUDITS);
    localStorage.removeItem(STORAGE_KEYS.HISTORICAL_SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.MASTER_GOALS);
    localStorage.removeItem(STORAGE_KEYS.WEIGHT_TEMPLATES);
    localStorage.removeItem(STORAGE_KEYS.GOAL_SIMULATIONS);

    setCompanies(INITIAL_COMPANIES);
    setBranches(INITIAL_BRANCHES);
    setSellers(INITIAL_SELLERS);
    setSales(generateInitialSales());
    setMonthlyHistory(INITIAL_MONTHLY_HISTORY);
    setSellerAliases(INITIAL_SELLER_ALIASES);
    setCompanyAliases(INITIAL_COMPANY_ALIASES);
    setImportTemplates(DEFAULT_IMPORT_TEMPLATES);
    setImportAudits(INITIAL_IMPORT_AUDITS);
    setHistoricalSessions({});
    setMasterGoals(INITIAL_MASTER_GOALS);
    setWeightTemplates(DEFAULT_WEIGHT_TEMPLATES);
    setGoalSimulations([]);
    setActiveCompanyId('comp-principal');
    setActiveBranchId('all');
    setActivePeriodNumber(12);
    setActivePeriodType('weekly');
    setDismissedAlertIds([]);
  };

  const exportDatabaseJSON = (): string => {
    return JSON.stringify(
      {
        version: '1.2',
        exportedAt: new Date().toISOString(),
        companies,
        branches,
        sellers,
        sales,
        monthlyHistory,
        sellerAliases,
        companyAliases,
        importTemplates,
        importAudits,
      },
      null,
      2
    );
  };

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.companies && parsed.branches && parsed.sellers && parsed.sales) {
        setCompanies(parsed.companies);
        setBranches(parsed.branches);
        setSellers(parsed.sellers);
        setSales(parsed.sales);
        if (parsed.monthlyHistory) setMonthlyHistory(parsed.monthlyHistory);
        if (parsed.sellerAliases) setSellerAliases(parsed.sellerAliases);
        if (parsed.companyAliases) setCompanyAliases(parsed.companyAliases);
        if (parsed.importTemplates) setImportTemplates(parsed.importTemplates);
        if (parsed.importAudits) setImportAudits(parsed.importAudits);
        if (parsed.companies.length > 0) {
          setActiveCompanyId(parsed.companies[0].id);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        branches,
        sellers,
        sales,
        monthlyHistory,
        sellerAliases,
        companyAliases,
        importTemplates,
        importAudits,
        masterGoals,
        weightTemplates,
        goalSimulations,
        historicalSessions,
        saveHistoricalSession,
        deleteHistoricalSession,
        commitHistoricalSessionToOfficial,
        activeCompanyId,
        activeBranchId,
        activePeriodNumber,
        activePeriodType,
        activeUserRole,
        activeSellerId,
        currentView,
        alerts,
        setActiveCompanyId,
        setActiveBranchId,
        setActivePeriodNumber,
        setActivePeriodType,
        setActiveUserRole,
        setActiveSellerId,
        setCurrentView,
        activeCompany,
        companyBranches,
        companySellers,
        companySales,
        companyMonthlyHistory,
        filteredSales,
        activeMasterGoal,
        saveMasterGoal,
        publishMasterGoal,
        saveWeightTemplate,
        deleteWeightTemplate,
        saveGoalSimulation,
        deleteGoalSimulation,
        applyGoalSimulationAsOfficial,
        updateSellerShare,
        getMasterGoalForPeriod,
        getSellerGoalDetail,
        getTeamParticipation,
        autoRedistributeTeamParticipation,
        applyMonthlyTargetToAllBranches,
        addCompany,
        updateCompany,
        deleteCompany,
        addBranch,
        updateBranch,
        deleteBranch,
        addSeller,
        batchAddSellers,
        updateSeller,
        deleteSeller,
        addSale,
        updateSale,
        deleteSale,
        batchAddSales,
        updateMonthlyRecord,
        saveSellerAlias,
        deleteSellerAlias,
        saveCompanyAlias,
        deleteCompanyAlias,
        saveImportTemplate,
        deleteImportTemplate,
        addImportAudit,
        confirmSmartImport,
        reprocessAudit,
        applySuggestedGoals,
        resetToDefaultData,
        exportDatabaseJSON,
        importDatabaseJSON,
        getSellerCalculation,
        dismissAlert,
        availabilities,
        workingDaysSettings,
        addAvailability,
        updateAvailability,
        deleteAvailability,
        updateWorkingDaysSettings,
        calculateAvailabilityRedistributionHelper,
        currentUser,
        authSession,
        setAuthSession,
        logout,
        resetAllDataAndLogout,
        isUserManagementOpen,
        setIsUserManagementOpen,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncTimestamp,
        triggerManualSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
