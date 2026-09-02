export type PeriodType = 'weekly' | 'monthly';
export type BranchType = 'headquarters' | 'branch';
export type UserRole = 'consultant' | 'manager' | 'seller';
export type GoalScenarioType = 'individual' | 'general' | 'both';

export interface GoalLevel {
  level: number; // 1, 2, 3, 4
  name: string; // "Meta 1", "Meta 2", "Meta 3", "Meta 4"
  revenueTarget: number; // R$
  commissionPercentage: number; // % (e.g. 1.30 for 1.30%)
}

export interface FinancialSettings {
  cmvPercentage: number; // % (e.g. 45.0)
  taxPercentage: number; // % (e.g. 8.0)
  cardFeePercentage: number; // % (e.g. 2.5)
  otherVariableCostsPercentage: number; // % (e.g. 1.0)
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  type: BranchType; // 'headquarters' (Matriz) | 'branch' (Filial)
  active: boolean;
  city?: string;
  state?: string;
}

export interface Seller {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  email?: string;
  role: string; // Cargo, ex: 'Consultor de Vendas', 'Vendedor Sênior'
  active: boolean;
  startDate: string; // ISO date 'YYYY-MM-DD'
  weeklyTarget?: number;
  monthlyTarget?: number;
  officialSharePercentage?: number; // % de responsabilidade oficial da vendedora na unidade (ex: 30 para 30%)
  historicalSharePercentage?: number; // % apurado historicamente (ex: 27.4)
  shareOriginType?: 'historical' | 'manual' | 'adjusted';
  seniorityLevel?: 'A' | 'B' | 'C' | 'senior' | 'pleno' | 'junior';
  averageTicket?: number; // Ticket médio base R$ (ex: 300)
  unitOnlyShare?: boolean; // Se true, calcula participação estritamente sobre a meta da unidade
  notes?: string;
  avatarUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  tradeName: string; // Nome Fantasia
  document?: string; // CNPJ
  segment: string; // Segmento, ex: 'Ótica e Varejo', 'Calçados', 'Alimentos'
  currency: string; // 'BRL'
  defaultPeriod: PeriodType; // 'weekly' | 'monthly'
  weekStartDay: number; // 0 = Sunday, 1 = Monday (default 1)
  numberOfLevels: number; // 1, 2, 3, 4
  goalScenario: GoalScenarioType; // 'individual' | 'general' | 'both'
  commissionRuleType?: 'monthly' | 'weekly'; // Regra A — Comissão mensal vs Regra B — Comissão semanal
  levels: GoalLevel[];
  levelGrowthPercentages?: number[]; // Padrão de crescimento entre níveis (ex: [0, 15, 10, 10])
  financialSettings: FinancialSettings;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface PaymentBreakdown {
  money: number; // Dinheiro
  check: number; // Cheque
  card: number; // Cartão
  billet: number; // Boleto
  installment: number; // Carnê
  digital: number; // Digital (PIX / Transferência)
  partialPayment: number; // Pagamento parcial
}

export interface SaleRecord {
  id: string;
  companyId: string;
  branchId: string;
  sellerId: string;
  periodType: PeriodType;
  year: number;
  periodNumber: number; // Week 1..52 or Month 1..12
  periodLabel: string; // e.g. "Semana 12 (17/03 - 23/03)" or "Março 2026"
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  revenue: number; // R$ faturamento realizado
  target: number; // R$ meta aplicável
  salesCount?: number;
  paymentBreakdown?: PaymentBreakdown;
  notes?: string;
  importId?: string;
  createdAt: string;
}

export interface CalculationResult {
  revenue: number;
  target: number;
  achievementPercentage: number; // e.g. 105.4%
  achievedLevel: number; // 0 = none, 1 = Meta 1, 2 = Meta 2, etc.
  achievedLevelName: string; // "Nenhuma", "Meta 1", "Meta 2", etc.
  commissionPercentage: number; // % applied to full revenue
  commissionAmount: number; // R$
  cmvAmount: number; // R$
  taxAmount: number; // R$
  cardFeeAmount: number; // R$
  otherCostsAmount: number; // R$
  totalVariableCosts: number; // R$
  contributionMarginAmount: number; // R$
  contributionMarginPercentage: number; // %
  gapToNextLevel: number; // R$ faltante para próximo nível
  nextLevelTarget: number | null; // R$ meta do próximo nível
  nextLevelCommissionPercentage: number | null;
  potentialCommissionNextLevel: number | null;
  potentialCommissionGain: number | null; // ganho extra R$ ao atingir próximo nível
}

export interface SimulationTier {
  level: number;
  name: string;
  targetRevenue: number;
  revenueGrowthAmount: number;
  revenueGrowthPercentage: number;
  cmvAmount: number;
  taxAmount: number;
  cardFeeAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  otherCostsAmount: number;
  totalVariableCosts: number;
  contributionMargin: number;
  contributionMarginPercentage: number;
  incrementalMarginAmount: number;
  incrementalMarginPercentage: number;
  incrementalRevenue: number;
  incrementalCosts: number;
  isViable: boolean;
  viabilityComment: string;
}

export interface GoalSuggestion {
  baselineRevenue: number;
  growthPercentage: number;
  suggestedLevels: GoalLevel[];
  historicalStats: {
    periodCount: number;
    mean: number;
    median: number;
    max: number;
    min: number;
    trendPercentage: number; // Taxa de crescimento recente %
    stdDev: number;
    consistencyScore: number; // 0..100
  };
}

export interface SystemAlert {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  category: 'performance' | 'near_goal' | 'goal_reached' | 'profitability';
  sellerName?: string;
  branchName?: string;
  metricValue?: string;
  timestamp: string;
}

export interface FilterState {
  companyId: string;
  branchId: string; // 'all' | 'headquarters' | specific branchId
  sellerId: string; // 'all' | specific sellerId
  periodType: PeriodType;
  year: number;
  periodNumber: number | 'all'; // week or month number
}

export interface MonthlyHistoricalRecord {
  monthNumber: number; // 1 to 12
  monthName: string; // "Janeiro", "Fevereiro", etc.
  year: number; // e.g. 2025
  consolidatedRevenue: number;
  branchRevenues: Record<string, number>; // branchId -> revenue
}

export type GoalMethodology =
  | 'hybrid_smart' // Meta Inteligente Híbrida Recomendada
  | 'yoy' // Mesmo período do ano anterior
  | 'recent_average' // Média recente (4s, 8s, 12s, 3m, 6m)
  | 'seasonality'; // Sazonalidade histórica

export type UnitDistributionMethod = 'historical' | 'equal' | 'manual';
export type WeeklyDistributionMethod = 'business_days' | 'equal' | 'manual' | 'historical';

export interface SmartGoalExplanation {
  targetMonthName: string;
  methodology: GoalMethodology;
  yoyRevenue: number;
  recentAverageRevenue: number;
  seasonalityIndex: number;
  recentTrendPercentage: number;
  desiredGrowthPercentage: number;
  weights: {
    yoy: number;
    recent: number;
    seasonality: number;
    trend: number;
  };
  suggestedBaseRevenue: number;
  confidenceScore: number;
  explanationText: string;
}

export interface UnitGoalBreakdown {
  branchId: string;
  branchName: string;
  historicalSharePercentage: number;
  assignedSharePercentage: number;
  suggestedTarget: number;
}

export interface WeeklyGoalBreakdown {
  weekNumber: number;
  weekLabel: string;
  businessDays: number;
  sharePercentage: number;
  suggestedTarget: number;
}

export interface ExtractedSellerRow {
  id: string;
  originalName: string;
  normalizedName: string;
  matchedSellerId: string | null;
  matchedSellerName?: string;
  salesCount: number;
  revenue: number; // Subtotal
  payments: PaymentBreakdown;
  calculatedPaymentsTotal: number;
  paymentDiff: number; // subtotal - paymentsTotal
  isValid: boolean;
  validationIssues: string[];
}

export interface ExtractedTotals {
  totalMoney: number;
  totalCheck: number;
  totalCard: number;
  totalBillet: number;
  totalInstallment: number;
  totalDigital: number;
  totalPartialPayment: number;
  reportedTotalRevenue: number;
  sumSellersRevenue: number;
  sumAllPayments: number;
  sellersDiff: number;
  paymentsDiff: number;
}

export interface ExtractedHeader {
  companyName: string;
  matchedCompanyId: string | null;
  matchedCompanyName?: string;
  branchName: string;
  matchedBranchId: string | null;
  matchedBranchName?: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  periodLabel: string;
  emissionDate?: string;
  reportTitle: string;
  fileName: string;
  fileType: 'pdf_text' | 'pdf_ocr' | 'excel_xlsx' | 'excel_xls' | 'csv' | 'txt';
  fileSize: number;
  fileHash: string;
  templateId?: string;
  templateName?: string;
}

export interface ImportConfidenceScore {
  score: number; // 0..100
  rating: 'high' | 'review_recommended' | 'review_mandatory';
  breakdown: {
    item: string;
    points: number;
    maxPoints: number;
    passed: boolean;
    message: string;
  }[];
}

export interface SmartImportPayload {
  id: string;
  header: ExtractedHeader;
  sellers: ExtractedSellerRow[];
  totals: ExtractedTotals;
  confidence: ImportConfidenceScore;
  isDuplicate: boolean;
  duplicateWarning?: string;
  status: 'validated' | 'needs_review' | 'imported' | 'error';
  rawText?: string;
  createdAt: string;
}

export interface SellerAlias {
  id: string;
  companyId: string;
  sellerId: string;
  sourceName: string;
  normalizedName: string;
}

export interface CompanyAlias {
  id: string;
  companyId: string;
  branchId: string;
  sourceName: string;
  normalizedName: string;
}

export interface ImportTemplate {
  id: string;
  name: string;
  systemName?: string;
  format?: 'pdf' | 'excel' | 'csv' | 'txt';
  sellerMarker?: string;
  totalMarker?: string;
  fingerprintKeywords: string[];
  fieldSynonyms: Record<string, string[]>;
  isSystem: boolean;
  createdAt: string;
}

export interface ImportAuditRecord {
  id: string;
  companyId: string;
  branchId: string;
  fileName: string;
  fileHash?: string;
  importedAt: string;
  importedByRole?: UserRole;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  totalRevenue: number;
  sellersCount: number;
  confidenceScore: number;
  parserVersion?: string;
  rawDocumentText?: string;
  payload?: SmartImportPayload;
  originalPayload?: SmartImportPayload;
  finalPayload?: SmartImportPayload;
  status: 'active' | 'reprocessed' | 'cancelled';
}

export type ActiveView =
  | 'dashboard'
  | 'commercial_intelligence'
  | 'goals_generator'
  | 'simulator'
  | 'sales_entry'
  | 'sales_history'
  | 'commissions'
  | 'sellers'
  | 'importer'
  | 'historical_importer'
  | 'reports'
  | 'company_settings'
  | 'seller_portal'
  | 'team_availability'
  | 'user_management';

export const ALLOWED_VIEWS_BY_ROLE: Record<UserRole, ActiveView[]> = {
  consultant: [
    'dashboard',
    'seller_portal',
    'commercial_intelligence',
    'goals_generator',
    'simulator',
    'commissions',
    'sales_entry',
    'sales_history',
    'sellers',
    'team_availability',
    'historical_importer',
    'importer',
    'reports',
    'company_settings',
    'user_management',
  ],
  manager: [
    'dashboard',
    'seller_portal',
    'commercial_intelligence',
    'goals_generator',
    'simulator',
    'commissions',
    'sales_entry',
    'sales_history',
    'sellers',
    'team_availability',
    'historical_importer',
    'importer',
    'reports',
    'company_settings',
  ],
  seller: [
    'seller_portal',
    'commissions',
    'sales_history',
  ],
};

// ==========================================
// MÓDULO DE IMPORTAÇÃO HISTÓRICA DOS 12 MESES
// ==========================================

export type DataOriginType = 'imported' | 'manual' | 'calculated' | 'estimated';
export type HistoricalDataQualityLevel = 1 | 2 | 3 | 4;
export type HistoricalFileType = 'sales' | 'sellers' | 'financial_costs' | 'cmv' | 'mixed' | 'unknown';

export interface NormalizedHistoricalRecord {
  id: string;
  companyId: string;
  branchId: string;
  branchName: string;
  sellerId?: string;
  sellerName?: string;
  sellerRole?: string;
  sellerActive?: boolean;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  year: number;
  month: number; // 1..12
  monthName: string;
  weekNumber?: number; // 1..52
  periodType: 'monthly' | 'weekly' | 'daily';
  revenue: number;
  salesCount: number;
  ticketMedio: number;
  cmvValor: number;
  cmvPercentual: number;
  impostos: number;
  taxasCartao: number;
  comissoes: number;
  outrosCustosVariaveis: number;
  custosFixos?: number;
  despesasOperacionais?: number;
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  origemFaturamento: DataOriginType;
  origemCustos: DataOriginType;
  arquivoOrigem: string;
  confiancaExtracao: number;
  isCrossMonth?: boolean;
  crossMonthDetails?: {
    month1: { month: number; days: number; revenue: number };
    month2: { month: number; days: number; revenue: number };
    allocationRule: 'proportional_days' | 'predominant_month' | 'manual';
  };
  paymentBreakdown?: PaymentBreakdown;
  hasDiscrepancy?: boolean;
  discrepancyNotes?: string;
}

export interface HistoricalMonthCoverage {
  year: number;
  monthNumber: number;
  monthName: string;
  revenueStatus: 'complete' | 'partial' | 'missing' | 'discrepancy';
  sellersStatus: 'complete' | 'partial' | 'missing';
  cmvStatus: 'complete' | 'estimated' | 'missing';
  taxesStatus: 'complete' | 'estimated' | 'missing';
  cardFeesStatus: 'complete' | 'estimated' | 'missing';
  overallStatus: 'complete' | 'partial' | 'error' | 'missing';
  totalRevenue: number;
  totalCmv: number;
  totalTaxes: number;
  totalCardFees: number;
  totalSalesCount: number;
  activeSellersCount: number;
  filesCount: number;
  missingFields: string[];
  issues: string[];
}

export interface HistoricalBatchStats {
  receivedFiles: number;
  processedFiles: number;
  autoIdentified: number;
  needsReview: number;
  duplicates: number;
  failed: number;
}

export interface HistoricalDiagnosticSummary {
  periodLabel: string;
  totalRevenue: number;
  monthlyMean: number;
  weeklyMean: number;
  bestMonth: { monthName: string; year: number; revenue: number; marginPct: number };
  worstMonth: { monthName: string; year: number; revenue: number; marginPct: number };
  bestSeller: { sellerName: string; totalRevenue: number; salesCount: number; ticketMedio: number; sharePct: number };
  bestBranch: { branchName: string; totalRevenue: number; sharePct: number };
  totalSalesCount: number;
  ticketMedioGeral: number;
  avgCmvPct: number;
  avgMarginPct: number;
  growthLast3MonthsPct: number;
  qualityLevel: HistoricalDataQualityLevel;
  qualityDescription: string;
  coverageMonthsCount: number; // e.g. 12
  totalMonths: number; // e.g. 12
  dataConfidenceScore: number; // e.g. 98%
}

export interface HistoricalFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  category: HistoricalFileType;
  status: 'processed' | 'needs_review' | 'duplicate' | 'error';
  detectedPeriod?: string;
  detectedBranch?: string;
  recordsCount: number;
  totalRevenue?: number;
  warning?: string;
  rawText?: string;
  fileHash?: string;
}

export interface HistoricalImportSession {
  id: string;
  companyId: string;
  companyName: string;
  periodMode: 'last_12_months' | 'previous_year' | 'current_year' | 'custom';
  startDate: string;
  endDate: string;
  stagingRecords: NormalizedHistoricalRecord[];
  coverage: HistoricalMonthCoverage[];
  batchStats: HistoricalBatchStats;
  diagnostics?: HistoricalDiagnosticSummary;
  qualityLevel: HistoricalDataQualityLevel;
  status: 'step1_company' | 'step2_upload' | 'step3_analysis' | 'step4_review' | 'step5_confirmed';
  files: HistoricalFileItem[];
  columnMappings?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// NOVA ARQUITETURA DE METAS: META MENSAL → PESO SEMANAL → PARTICIPAÇÃO → INDIVIDUAL
// =========================================================================

export interface CommercialWeekPeriod {
  weekNumber: number; // 1, 2, 3, 4, 5
  label: string; // "Semana 1", "Semana 2", etc.
  startDay: number; // 1, 8, 15, 22, 29
  endDay: number; // 7, 14, 21, 28, 30, 31
  startDate?: string; // YYYY-MM-DD (opcional para compatibilidade)
  endDate?: string; // YYYY-MM-DD (opcional para compatibilidade)
  dateRangeLabel: string; // "01 a 07", "08 a 14", "15 a 21", "22 a 30", "22 a 28", "29 a 31"
  weightPercentage: number; // % do faturamento mensal alocado nesta semana (ex: 15, 20, 25, 40)
  revenueTarget: number; // Meta monetária da semana = Meta Mensal da Unidade * (weightPercentage / 100)
}

export interface WeeklyWeightTemplate {
  id: string;
  name: string; // "Mês normal", "Início fraco", "Distribuição Igualitária", "Final de Mês Agressivo", "Personalizado"
  description?: string;
  weeksCount: 4 | 5;
  weights: number[]; // e.g. [15, 20, 25, 40] ou [20, 25, 25, 30]
  isSystemDefault?: boolean;
  companyId?: string;
}

export interface MonthlyMasterGoal {
  id: string;
  companyId: string;
  branchId: string; // 'all' (Consolidado) ou branchId da Matriz/Filial
  branchName: string;
  year: number;
  monthNumber: number; // 1..12
  monthName: string;
  monthlyTarget: number; // Fonte de Verdade Principal (ex: R$ 200.000)
  numberOfWeeks: 4 | 5;
  weeks: CommercialWeekPeriod[];
  totalWeight: number; // Soma dos pesos das semanas (deve ser exatamente 100%)
  isValid: boolean;
  validationMessage?: string;
  templateUsed?: string;
  commissionRuleType: 'monthly' | 'weekly';
  status: 'draft' | 'published';
  levels?: GoalLevel[];
  levelGrowthPercentages?: number[];
  publishedAt?: string;
  updatedAt: string;
  changeLogs?: GoalChangeLog[];
}

export interface GoalChangeLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole?: string;
  action: 'create' | 'update_target' | 'update_levels' | 'update_shares' | 'publish' | 'manual_override' | 'general_save';
  description: string;
  details?: {
    oldMonthlyTarget?: number;
    newMonthlyTarget?: number;
    changedLevels?: { name: string; oldVal?: number; newVal: number }[];
    sellerName?: string;
    oldShare?: number;
    newShare?: number;
  };
}

export interface SellerWeeklyGoalBreakdown {
  weekNumber: number;
  periodLabel: string;
  label?: string;
  dateRangeLabel: string;
  weightPercentage: number;
  weeklyTarget: number;
  targetAmount?: number;
  realizedRevenue: number;
  achievementPercentage: number;
  remainingToTarget: number;
  salesCount: number;
  averageTicket: number;
  estimatedRequiredSales: number;
  remainingRequiredSales: number;
}

export interface SellerGoalDetail {
  sellerId: string;
  sellerName: string;
  branchId: string;
  branchName: string;
  year?: number;
  monthNumber?: number;
  monthName?: string;
  unitMonthlyTarget?: number;
  seniorityLevel?: 'A' | 'B' | 'C' | 'senior' | 'pleno' | 'junior';
  officialSharePercentage: number; // % oficial cadastrada (ex: 30)
  historicalSharePercentage: number; // % histórica apurada nos 3M/6M/12M (ex: 27.4)
  shareOriginType: 'historical' | 'manual' | 'adjusted';
  monthlyTarget: number; // Meta da Unidade * (officialSharePercentage / 100)
  realizedRevenue: number;
  projectedRevenue?: number;
  estimatedCommissionAmount?: number;
  commissionRuleType?: 'monthly' | 'weekly';
  achievementPercentage: number;
  remainingToTarget: number;
  averageTicket: number; // Ticket médio atual
  historicalAverageTicket: number;
  last3MonthsAverageTicket: number;
  currentMonthAverageTicket: number;
  currentWeekAverageTicket: number;
  requiredSalesTotal: number; // Meta restante / ticket médio
  requiredSalesCount?: number; // alias
  totalSalesCount: number;
  salesCount?: number; // alias
  customersCount?: number;
  ticketPerCustomer?: number;
  conversionRate?: number;
  plannedShare: number; // % planejada
  realShare: number; // % real realizada no mês
  shareDiffPoints: number; // realShare - plannedShare (p.p.)
  weeklyBreakdown: SellerWeeklyGoalBreakdown[];
  weeklyGoals?: SellerWeeklyGoalBreakdown[]; // compatibility alias
}

export interface TeamParticipationSummary {
  branchId: string;
  branchName: string;
  totalMonthlyTarget: number;
  sellers: {
    sellerId: string;
    sellerName: string;
    seniorityLevel?: 'A' | 'B' | 'C' | 'senior' | 'pleno' | 'junior';
    officialSharePercentage: number;
    historicalSharePercentage: number;
    shareOriginType: 'historical' | 'manual' | 'adjusted';
    monthlyTarget: number;
    realizedRevenue: number;
    achievementPercentage: number;
    averageTicket: number;
    salesCount: number;
  }[];
  totalSharePercentage: number; // Soma das participações (deve ser 100%)
  isValid: boolean;
  validationMessage?: string;
}

export interface GoalSimulationScenario {
  id: string;
  name: string;
  companyId: string;
  branchId: string;
  year: number;
  monthNumber: number;
  originalMonthlyTarget: number;
  simulatedMonthlyTarget: number;
  targetGrowthPct: number; // ex: +10%
  simulatedWeeks: CommercialWeekPeriod[];
  simulatedSellers: {
    sellerId: string;
    sellerName: string;
    originalShare: number;
    simulatedShare: number;
    originalMonthlyTarget: number;
    simulatedMonthlyTarget: number;
    targetDiffAmount: number;
    growthRequiredPct: number;
    originalTicket: number;
    simulatedTicket: number;
    originalRequiredSales: number;
    simulatedRequiredSales: number;
    salesDiff: number;
  }[];
  redistributionMode: 'proportional_others' | 'specific_sellers' | 'increase_total_target' | 'keep_over_100';
  financialImpact: {
    revenue: number;
    revenueDiff: number;
    cmvAmount: number;
    taxAmount: number;
    cardFeeAmount: number;
    commissionAmount: number;
    totalCosts: number;
    marginAmount: number;
    marginPct: number;
    incrementalMarginAmount: number;
    incrementalMarginPct: number;
  };
  createdAt: string;
}

// ==========================================
// MÓDULO DE DISPONIBILIDADE E FÉRIAS DA EQUIPE
// ==========================================

export type AbsenceType =
  | 'vacation' // Férias
  | 'leave' // Afastamento
  | 'medical_leave' // Licença
  | 'day_off' // Folga
  | 'training' // Treinamento
  | 'absence' // Ausência
  | 'part_time' // Redução de jornada
  | 'hiring' // Entrada no meio do mês
  | 'termination' // Desligamento no meio do mês
  | 'custom'; // Personalizado

export type AvailabilityRedistributionMethod =
  | 'proportional' // OPÇÃO 1 — Redistribuir proporcionalmente (Recomendada)
  | 'equal' // OPÇÃO 2 — Redistribuir igualmente
  | 'manual' // OPÇÃO 3 — Redistribuição manual
  | 'reduce_unit'; // OPÇÃO 4 — Reduzir meta da unidade

export interface DayOfWeekSchedule {
  day: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  name: string;
  isOpen: boolean;
}

export interface CompanyHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isClosed: boolean;
}

export interface WorkingDaysSettings {
  weeklySchedule: DayOfWeekSchedule[];
  holidays: CompanyHoliday[];
}

export interface SellerAvailability {
  id: string;
  companyId: string;
  branchId: string;
  sellerId: string;
  absenceType: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  availabilityPercentage: number; // 0..100
  redistributionEnabled: boolean;
  redistributionMethod: AvailabilityRedistributionMethod;
  manualAllocations?: Record<string, number>; // sellerId -> R$
  adjustGoalLevelsProportionally?: boolean; // Padrão true
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRedistributionResult {
  availabilityId?: string;
  companyId: string;
  branchId: string;
  year: number;
  monthNumber: number;
  originalUnitTarget: number;
  adjustedUnitTarget: number;
  unitTargetDifference: number;
  redistributionMethod: AvailabilityRedistributionMethod;
  sellerImpacts: {
    sellerId: string;
    sellerName: string;
    officialShare: number;
    daysExpected: number;
    daysAvailable: number;
    availabilityFactor: number;
    originalMonthlyTarget: number;
    adjustedMonthlyTarget: number;
    differenceAmount: number;
    differencePct: number;
    overloadPercentage: number;
    isOverloaded: boolean;
    overloadWarningMessage?: string;
    adjustedLevels?: GoalLevel[];
    revenuePerAvailableDay: number;
  }[];
  weeklyImpacts: {
    weekNumber: number;
    weekLabel: string;
    weekWeight: number;
    weekUnitTarget: number;
    sellerAvailabilities: Record<string, {
      daysExpected: number;
      daysAvailable: number;
      factor: number;
      originalTarget: number;
      adjustedTarget: number;
      differenceAmount: number;
    }>;
  }[];
}

// ==========================================
// MÓDULO DE AUTENTICAÇÃO E APROVAÇÃO DE ACESSO
// ==========================================

export type UserStatus = 'pending_approval' | 'approved' | 'rejected';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  approvalToken?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
  loginAt: string;
}

