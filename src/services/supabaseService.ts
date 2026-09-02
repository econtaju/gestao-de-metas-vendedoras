import { createClient } from '@supabase/supabase-js';
import {
  AppUser,
  Company,
  Branch,
  Seller,
  SaleRecord,
  MonthlyMasterGoal,
} from '../types';

const SUPABASE_URL =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL)) ||
  'https://iaoyxeehyviyfyckzwxc.supabase.co';

const SUPABASE_ANON_KEY =
  ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhb3l4ZWVoeXZpeWZ5Y2t6d3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODUzODAsImV4cCI6MjA3MDA2MTM4MH0.t6IUuajZIpIkTFgKRgeCj0PYHHm4prMuwFaNfUUxxnU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Prefix exclusivo para isolamento total das tabelas do GMC (Gestão de Metas Clientes)
export const TABLE_PREFIX = 'gmc_';

export const SUPABASE_TABLES = {
  USERS: `${TABLE_PREFIX}users`,
  COMPANIES: `${TABLE_PREFIX}companies`,
  BRANCHES: `${TABLE_PREFIX}branches`,
  SELLERS: `${TABLE_PREFIX}sellers`,
  SALES: `${TABLE_PREFIX}sales`,
  MASTER_GOALS: `${TABLE_PREFIX}master_goals`,
  AVAILABILITIES: `${TABLE_PREFIX}availabilities`,
  WORKING_DAYS: `${TABLE_PREFIX}working_days`,
};

/**
 * Script SQL para inicialização das tabelas no Supabase caso ainda não existam.
 * Este script pode ser executado no SQL Editor do Supabase para criar as tabelas com o prefixo isolado gmc_.
 */
export const SUPABASE_SETUP_SQL = `
-- TABELAS DO SISTEMA: GESTÃO DE METAS CLIENTES (GMC)
-- Prefixo gmc_ para isolamento total no banco de dados

CREATE TABLE IF NOT EXISTS gmc_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultant',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  approval_token TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  segment TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_branches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_sellers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_sales (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  seller_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_master_goals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_availabilities (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

/**
 * Funções de sincronização e autenticação de usuários no Supabase
 */
export async function syncUserToSupabase(user: AppUser): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.USERS).upsert(
      {
        id: user.id,
        username: user.username.toLowerCase().trim(),
        name: user.name,
        email: user.email || null,
        password_hash: user.passwordHash,
        role: user.role,
        status: user.status,
        approval_token: user.approvalToken || null,
        approved_at: user.approvedAt || null,
        approved_by: user.approvedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Supabase sync warning (fallback para localStorage):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase offline ou inacessível, usando persistência local.', err);
    return false;
  }
}

export async function fetchUsersFromSupabase(): Promise<AppUser[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return null;
    }

    return data.map((row: any) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      approvalToken: row.approval_token,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .delete()
      .eq('id', userId);

    if (error) {
      console.warn('Supabase delete user warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase offline ao excluir usuário.', err);
    return false;
  }
}

/**
 * Sincronização de Empresas (Companies) no Supabase
 */
export async function syncCompanyToSupabase(company: Company): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.COMPANIES).upsert(
      {
        id: company.id,
        name: company.name,
        trade_name: company.tradeName,
        document: company.document || null,
        segment: company.segment || null,
        data: company,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Supabase company sync warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase company sync offline.', err);
    return false;
  }
}

export async function fetchCompaniesFromSupabase(): Promise<Company[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.COMPANIES)
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => row.data as Company);
  } catch {
    return null;
  }
}

export async function deleteCompanyFromSupabase(companyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.COMPANIES)
      .delete()
      .eq('id', companyId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sincronização de Filiais (Branches) no Supabase
 */
export async function syncBranchToSupabase(branch: Branch): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.BRANCHES).upsert(
      {
        id: branch.id,
        company_id: branch.companyId,
        name: branch.name,
        data: branch,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchBranchesFromSupabase(): Promise<Branch[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.BRANCHES)
      .select('*')
      .order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => row.data as Branch);
  } catch {
    return null;
  }
}

export async function deleteBranchFromSupabase(branchId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.BRANCHES)
      .delete()
      .eq('id', branchId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sincronização de Vendedores (Sellers) no Supabase
 */
export async function syncSellerToSupabase(seller: Seller): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.SELLERS).upsert(
      {
        id: seller.id,
        company_id: seller.companyId,
        branch_id: seller.branchId,
        name: seller.name,
        data: seller,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSellersFromSupabase(): Promise<Seller[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.SELLERS)
      .select('*')
      .order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => row.data as Seller);
  } catch {
    return null;
  }
}

export async function deleteSellerFromSupabase(sellerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.SELLERS)
      .delete()
      .eq('id', sellerId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sincronização de Metas Mestre (Master Goals) no Supabase
 */
export async function syncMasterGoalToSupabase(goal: MonthlyMasterGoal): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.MASTER_GOALS).upsert(
      {
        id: goal.id,
        company_id: goal.companyId,
        branch_id: goal.branchId,
        data: goal,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchMasterGoalsFromSupabase(): Promise<Record<string, MonthlyMasterGoal> | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.MASTER_GOALS)
      .select('*');
    if (error || !data || data.length === 0) return null;
    const map: Record<string, MonthlyMasterGoal> = {};
    data.forEach((row: any) => {
      const g = row.data as MonthlyMasterGoal;
      const key = `${g.companyId}-${g.branchId}-${g.year}-${g.monthNumber}`;
      map[key] = g;
    });
    return map;
  } catch {
    return null;
  }
}

/**
 * Sincronização de Lançamentos de Vendas (Sales) no Supabase
 */
export async function syncSaleToSupabase(sale: SaleRecord): Promise<boolean> {
  try {
    const { error } = await supabase.from(SUPABASE_TABLES.SALES).upsert(
      {
        id: sale.id,
        company_id: sale.companyId,
        seller_id: sale.sellerId || null,
        data: sale,
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSalesFromSupabase(): Promise<SaleRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.SALES)
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return null;
    return data.map((row: any) => row.data as SaleRecord);
  } catch {
    return null;
  }
}

export async function deleteSaleFromSupabase(saleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.SALES)
      .delete()
      .eq('id', saleId);
    return !error;
  } catch {
    return false;
  }
}
