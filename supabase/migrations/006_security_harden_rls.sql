-- Nexus Food — Hardening de segurança (privilege escalation + RLS write)
-- Corrige: auto-elevação is_platform_admin e writes food sem permissão de módulo

-- ---------------------------------------------------------------------------
-- Impede usuário comum de se tornar platform admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_platform_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    IF NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Não é permitido alterar is_platform_admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_platform_admin ON public.profiles;
CREATE TRIGGER profiles_prevent_self_platform_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_platform_admin();

-- Reforça policy de update com WITH CHECK
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Writes do domínio food exigem admin OU permissão de módulo
-- (antes: qualquer member podia escrever em todas as tabelas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('ingredients', 'ingredients'),
      ('products', 'products'),
      ('recipes', 'recipes'),
      ('recipe_items', 'recipes'),
      ('inventory_movements', 'inventory'),
      ('suppliers', 'suppliers'),
      ('supplier_products', 'suppliers'),
      ('ingredient_price_history', 'purchases'),
      ('purchases', 'purchases'),
      ('purchase_items', 'purchases'),
      ('waste_records', 'waste'),
      ('sales', 'sales'),
      ('sale_items', 'sales'),
      ('notifications', 'dashboard')
    ) AS t(table_name, module_key)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.table_name || '_write', rec.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (
           public.is_company_admin(company_id)
           OR public.company_has_permission(company_id, %L)
         )
         WITH CHECK (
           public.is_company_admin(company_id)
           OR public.company_has_permission(company_id, %L)
         )',
      rec.table_name || '_write',
      rec.table_name,
      rec.module_key,
      rec.module_key
    );
  END LOOP;
END $$;
