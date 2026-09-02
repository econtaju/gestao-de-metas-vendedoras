import { createClient } from '@supabase/supabase-js';
import { AppUser } from '../types';

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
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_branches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_sellers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_sales (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmc_master_goals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
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
