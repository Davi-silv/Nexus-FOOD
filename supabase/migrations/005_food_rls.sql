-- Nexus Food — RLS domínio food (todas com company_id)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ingredients', 'products', 'recipes', 'recipe_items',
    'inventory_movements', 'suppliers', 'supplier_products',
    'ingredient_price_history', 'purchases', 'purchase_items',
    'waste_records', 'sales', 'sale_items', 'notifications'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (public.is_company_member(company_id))',
      t || '_select', t
    );

    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id))',
      t || '_write', t
    );
  END LOOP;
END $$;
