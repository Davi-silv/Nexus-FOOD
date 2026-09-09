-- Nexus Food — RLS nas tabelas core
-- Isolamento: usuário só vê dados da própria empresa (exceto platform admin)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_admin());

-- companies
CREATE POLICY companies_select_member ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_company_member(id) OR public.is_platform_admin());

CREATE POLICY companies_update_admin ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(id) OR public.is_platform_admin());

CREATE POLICY companies_insert_authenticated ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin());

-- company_users
CREATE POLICY company_users_select ON public.company_users
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id) OR public.is_platform_admin());

CREATE POLICY company_users_write_admin ON public.company_users
  FOR ALL TO authenticated
  USING (public.is_company_admin(company_id) OR public.is_platform_admin())
  WITH CHECK (public.is_company_admin(company_id) OR public.is_platform_admin());

-- restaurant_settings
CREATE POLICY restaurant_settings_select ON public.restaurant_settings
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY restaurant_settings_write ON public.restaurant_settings
  FOR ALL TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

-- plans (catálogo público autenticado)
CREATE POLICY plans_select_all ON public.plans
  FOR SELECT TO authenticated
  USING (active = TRUE OR public.is_platform_admin());

-- subscriptions
CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id) OR public.is_platform_admin());

CREATE POLICY subscriptions_write_platform ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
