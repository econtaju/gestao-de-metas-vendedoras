-- ==============================================================================
-- SISTEMA: GESTÃO DE METAS CLIENTES (GMC)
-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE COM ISOLAMENTO TOTAL (PREFIXO gmc_)
-- ==============================================================================

-- 1. Tabela de Usuários e Autenticação
CREATE TABLE IF NOT EXISTS public.gmc_users (
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

-- 2. Tabela de Empresas Clientes
CREATE TABLE IF NOT EXISTS public.gmc_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  segment TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Filiais / Unidades
CREATE TABLE IF NOT EXISTS public.gmc_branches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Vendedores
CREATE TABLE IF NOT EXISTS public.gmc_sellers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Vendas Lançadas e Importadas
CREATE TABLE IF NOT EXISTS public.gmc_sales (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  seller_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Metas Mestre e Desdobramentos Semanais
CREATE TABLE IF NOT EXISTS public.gmc_master_goals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Disponibilidade da Equipe e Férias
CREATE TABLE IF NOT EXISTS public.gmc_availabilities (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita Row Level Security (RLS) para proteção das tabelas
ALTER TABLE public.gmc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_master_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmc_availabilities ENABLE ROW LEVEL SECURITY;

-- Criação de Políticas de Acesso (RLS) para a chave pública (anon)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_users_all_access') THEN
    CREATE POLICY gmc_users_all_access ON public.gmc_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_companies_all_access') THEN
    CREATE POLICY gmc_companies_all_access ON public.gmc_companies FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_branches_all_access') THEN
    CREATE POLICY gmc_branches_all_access ON public.gmc_branches FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_sellers_all_access') THEN
    CREATE POLICY gmc_sellers_all_access ON public.gmc_sellers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_sales_all_access') THEN
    CREATE POLICY gmc_sales_all_access ON public.gmc_sales FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_master_goals_all_access') THEN
    CREATE POLICY gmc_master_goals_all_access ON public.gmc_master_goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmc_availabilities_all_access') THEN
    CREATE POLICY gmc_availabilities_all_access ON public.gmc_availabilities FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
