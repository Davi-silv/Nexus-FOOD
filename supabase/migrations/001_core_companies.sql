-- Nexus Food — Core multiempresa
-- Tenant = companies (equivalente a workspaces do Nexus ERP)
-- company_id em todos os dados comerciais

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- companies (restaurante / tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  segment TEXT,
  plan_slug TEXT NOT NULL DEFAULT 'start',
  status TEXT NOT NULL DEFAULT 'trial',
  ideal_cmv NUMERIC(5, 2) NOT NULL DEFAULT 32,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_status_check CHECK (
    status IN ('trial', 'active', 'past_due', 'suspended')
  ),
  CONSTRAINT companies_plan_check CHECK (
    plan_slug IN ('start', 'pro', 'food_plus')
  )
);

CREATE INDEX idx_companies_owner ON public.companies (owner_id);
CREATE INDEX idx_companies_status ON public.companies (status);
CREATE INDEX idx_companies_plan ON public.companies (plan_slug);

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- company_users
-- ---------------------------------------------------------------------------
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_users_role_check CHECK (
    role IN ('company_admin', 'employee')
  ),
  CONSTRAINT company_users_unique UNIQUE (company_id, user_id)
);

CREATE INDEX idx_company_users_company ON public.company_users (company_id);
CREATE INDEX idx_company_users_user ON public.company_users (user_id);

CREATE TRIGGER company_users_set_updated_at
  BEFORE UPDATE ON public.company_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- restaurant_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.restaurant_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  currency TEXT NOT NULL DEFAULT 'BRL',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER restaurant_settings_set_updated_at
  BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans (feature flags — sem cobrança real)
-- ---------------------------------------------------------------------------
CREATE TABLE public.plans (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (slug, name, description, price_monthly, features, sort_order) VALUES
  ('start', 'START', 'Gestão essencial', 79.90, '["dashboard","products","ingredients","inventory","finance","users"]'::jsonb, 1),
  ('pro', 'PRO', 'Custos e CMV', 149.90, '["dashboard","products","ingredients","recipes","inventory","suppliers","purchases","waste","finance","cmv","reports","users"]'::jsonb, 2),
  ('food_plus', 'FOOD+', 'Preparado para PDV e delivery', 249.90, '["dashboard","products","ingredients","recipes","inventory","suppliers","purchases","waste","finance","cmv","reports","users","pdv_ready","delivery_ready","ai_ready"]'::jsonb, 3);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL REFERENCES public.plans (slug),
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')
  )
);

CREATE UNIQUE INDEX idx_subscriptions_company ON public.subscriptions (company_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions (status);
