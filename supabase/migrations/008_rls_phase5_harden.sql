-- Nexus Food — FASE 5: hardening RLS / isolamento multiempresa no banco
-- Objetivos:
-- 1) FORCE RLS (owner não bypassa)
-- 2) Revogar acesso anon/PUBLIC
-- 3) WITH CHECK em companies update
-- 4) Impedir troca de company_id em UPDATE
-- 5) Garantir que itens filhos não referenciem entidades de outro tenant

-- ---------------------------------------------------------------------------
-- FORCE ROW LEVEL SECURITY em todas as tabelas sensíveis
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'companies',
    'company_users',
    'restaurant_settings',
    'plans',
    'subscriptions',
    'ingredients',
    'products',
    'recipes',
    'recipe_items',
    'inventory_movements',
    'suppliers',
    'supplier_products',
    'ingredient_price_history',
    'purchases',
    'purchase_items',
    'waste_records',
    'sales',
    'sale_items',
    'notifications',
    'finance_categories',
    'finance_transactions',
    'accounts_payable',
    'accounts_receivable'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Higiene de privilégios: anon não lê/escreve dados de negócio
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'companies',
    'company_users',
    'restaurant_settings',
    'plans',
    'subscriptions',
    'ingredients',
    'products',
    'recipes',
    'recipe_items',
    'inventory_movements',
    'suppliers',
    'supplier_products',
    'ingredient_price_history',
    'purchases',
    'purchase_items',
    'waste_records',
    'sales',
    'sale_items',
    'notifications',
    'finance_categories',
    'finance_transactions',
    'accounts_payable',
    'accounts_receivable'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- companies: reforça WITH CHECK no UPDATE (impede mover ownership indevido)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS companies_update_admin ON public.companies;
CREATE POLICY companies_update_admin ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(id) OR public.is_platform_admin())
  WITH CHECK (public.is_company_admin(id) OR public.is_platform_admin());

-- DELETE de empresa só plataforma
DROP POLICY IF EXISTS companies_delete_platform ON public.companies;
CREATE POLICY companies_delete_platform ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- restaurant_settings: plataforma também pode manter suporte
DROP POLICY IF EXISTS restaurant_settings_select ON public.restaurant_settings;
CREATE POLICY restaurant_settings_select ON public.restaurant_settings
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS restaurant_settings_write ON public.restaurant_settings;
CREATE POLICY restaurant_settings_write ON public.restaurant_settings
  FOR ALL TO authenticated
  USING (public.is_company_admin(company_id) OR public.is_platform_admin())
  WITH CHECK (public.is_company_admin(company_id) OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Impede alterar company_id após criação (anti cross-tenant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_company_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido alterar company_id';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_company_id_change() FROM PUBLIC;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'company_users',
    'ingredients',
    'products',
    'recipes',
    'recipe_items',
    'inventory_movements',
    'suppliers',
    'supplier_products',
    'ingredient_price_history',
    'purchases',
    'purchase_items',
    'waste_records',
    'sales',
    'sale_items',
    'notifications',
    'finance_categories',
    'finance_transactions',
    'accounts_payable',
    'accounts_receivable',
    'subscriptions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_prevent_company_id_change ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_prevent_company_id_change
         BEFORE UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.prevent_company_id_change()',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Consistência: filhos devem apontar para pais do mesmo company_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_recipe_item_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipe_company UUID;
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO recipe_company FROM public.recipes WHERE id = NEW.recipe_id;
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;

  IF recipe_company IS NULL OR ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Ficha ou ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM recipe_company
     OR NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: recipe_item cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_purchase_item_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purchase_company UUID;
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO purchase_company FROM public.purchases WHERE id = NEW.purchase_id;
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;

  IF purchase_company IS NULL OR ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Compra ou ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM purchase_company
     OR NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: purchase_item cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_sale_item_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_company UUID;
  product_company UUID;
BEGIN
  SELECT company_id INTO sale_company FROM public.sales WHERE id = NEW.sale_id;
  SELECT company_id INTO product_company FROM public.products WHERE id = NEW.product_id;

  IF sale_company IS NULL OR product_company IS NULL THEN
    RAISE EXCEPTION 'Venda ou produto inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM sale_company
     OR NEW.company_id IS DISTINCT FROM product_company THEN
    RAISE EXCEPTION 'Acesso negado: sale_item cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_supplier_product_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supplier_company UUID;
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO supplier_company FROM public.suppliers WHERE id = NEW.supplier_id;
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;

  IF supplier_company IS NULL OR ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Fornecedor ou ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM supplier_company
     OR NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: supplier_product cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_inventory_movement_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;
  IF ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: inventory_movement cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_waste_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;
  IF ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: waste_record cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_price_history_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ingredient_company UUID;
BEGIN
  SELECT company_id INTO ingredient_company FROM public.ingredients WHERE id = NEW.ingredient_id;
  IF ingredient_company IS NULL THEN
    RAISE EXCEPTION 'Ingrediente inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM ingredient_company THEN
    RAISE EXCEPTION 'Acesso negado: ingredient_price_history cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_recipe_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_company UUID;
BEGIN
  SELECT company_id INTO product_company FROM public.products WHERE id = NEW.product_id;
  IF product_company IS NULL THEN
    RAISE EXCEPTION 'Produto inválido';
  END IF;
  IF NEW.company_id IS DISTINCT FROM product_company THEN
    RAISE EXCEPTION 'Acesso negado: recipe cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recipe_items_enforce_company ON public.recipe_items;
CREATE TRIGGER recipe_items_enforce_company
  BEFORE INSERT OR UPDATE ON public.recipe_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_recipe_item_company();

DROP TRIGGER IF EXISTS purchase_items_enforce_company ON public.purchase_items;
CREATE TRIGGER purchase_items_enforce_company
  BEFORE INSERT OR UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_purchase_item_company();

DROP TRIGGER IF EXISTS sale_items_enforce_company ON public.sale_items;
CREATE TRIGGER sale_items_enforce_company
  BEFORE INSERT OR UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_item_company();

DROP TRIGGER IF EXISTS supplier_products_enforce_company ON public.supplier_products;
CREATE TRIGGER supplier_products_enforce_company
  BEFORE INSERT OR UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_product_company();

DROP TRIGGER IF EXISTS inventory_movements_enforce_company ON public.inventory_movements;
CREATE TRIGGER inventory_movements_enforce_company
  BEFORE INSERT OR UPDATE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_movement_company();

DROP TRIGGER IF EXISTS waste_records_enforce_company ON public.waste_records;
CREATE TRIGGER waste_records_enforce_company
  BEFORE INSERT OR UPDATE ON public.waste_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_waste_company();

DROP TRIGGER IF EXISTS ingredient_price_history_enforce_company ON public.ingredient_price_history;
CREATE TRIGGER ingredient_price_history_enforce_company
  BEFORE INSERT OR UPDATE ON public.ingredient_price_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_price_history_company();

DROP TRIGGER IF EXISTS recipes_enforce_company ON public.recipes;
CREATE TRIGGER recipes_enforce_company
  BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_recipe_company();

-- ---------------------------------------------------------------------------
-- Financeiro: categoria referenciada deve ser da mesma empresa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_finance_category_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_company UUID;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT company_id INTO category_company
  FROM public.finance_categories
  WHERE id = NEW.category_id;
  IF category_company IS NULL THEN
    RAISE EXCEPTION 'Categoria financeira inválida';
  END IF;
  IF NEW.company_id IS DISTINCT FROM category_company THEN
    RAISE EXCEPTION 'Acesso negado: lançamento financeiro cruzando empresas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_transactions_enforce_category ON public.finance_transactions;
CREATE TRIGGER finance_transactions_enforce_category
  BEFORE INSERT OR UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_category_company();

DROP TRIGGER IF EXISTS accounts_payable_enforce_category ON public.accounts_payable;
CREATE TRIGGER accounts_payable_enforce_category
  BEFORE INSERT OR UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_category_company();

DROP TRIGGER IF EXISTS accounts_receivable_enforce_category ON public.accounts_receivable;
CREATE TRIGGER accounts_receivable_enforce_category
  BEFORE INSERT OR UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_category_company();

-- ---------------------------------------------------------------------------
-- Inventário: previous/new quantity para auditoria (alinha contrato de domínio)
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS previous_quantity NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS new_quantity NUMERIC(14, 4);

COMMENT ON COLUMN public.inventory_movements.previous_quantity IS 'Saldo antes do movimento';
COMMENT ON COLUMN public.inventory_movements.new_quantity IS 'Saldo depois do movimento';
