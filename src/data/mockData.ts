import {
  Company,
  Branch,
  Seller,
  SaleRecord,
  MonthlyHistoricalRecord,
  SellerAlias,
  CompanyAlias,
  ImportAuditRecord,
  MonthlyMasterGoal,
} from '../types';

export const INITIAL_MONTHLY_HISTORY: Record<string, MonthlyHistoricalRecord[]> = {};

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-principal',
    name: 'Minha Empresa',
    tradeName: 'Matriz',
    document: '',
    segment: 'Varejo / Serviços',
    currency: 'BRL',
    defaultPeriod: 'weekly',
    weekStartDay: 1, // Segunda-feira
    numberOfLevels: 4,
    goalScenario: 'both',
    financialSettings: {
      cmvPercentage: 40.0,
      taxPercentage: 6.0,
      cardFeePercentage: 2.0,
      otherVariableCostsPercentage: 1.0,
    },
    levels: [
      {
        level: 1,
        name: 'Meta 1',
        revenueTarget: 0,
        commissionPercentage: 0,
      },
      {
        level: 2,
        name: 'Meta 2',
        revenueTarget: 0,
        commissionPercentage: 0,
      },
      {
        level: 3,
        name: 'Meta 3',
        revenueTarget: 0,
        commissionPercentage: 0,
      },
      {
        level: 4,
        name: 'Meta 4',
        revenueTarget: 0,
        commissionPercentage: 0,
      },
    ],
    notes: '',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-matriz',
    companyId: 'comp-principal',
    name: 'Unidade Principal',
    type: 'headquarters',
    active: true,
  },
];

export const INITIAL_SELLERS: Seller[] = [];

export const INITIAL_SELLER_ALIASES: SellerAlias[] = [];

export const INITIAL_COMPANY_ALIASES: CompanyAlias[] = [];

export const INITIAL_IMPORT_AUDITS: ImportAuditRecord[] = [];

export const INITIAL_MASTER_GOALS: Record<string, MonthlyMasterGoal> = {};

export const generateInitialSales = (): SaleRecord[] => [];
