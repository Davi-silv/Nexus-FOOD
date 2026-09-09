-- Nexus Food — Schema food (Fases 5–11)
-- Todas as tabelas com company_id + timestamps

-- ingredients
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  min_stock NUMERIC(14, 4) NOT NULL DEFAULT 0,
  current_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  supplier_id UUID,
  last_purchase_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredients_unit_check CHECK (
    unit IN ('kg', 'g', 'L', 'ml', 'un', 'cx', 'pct')
  ),
  CONSTRAINT ingredients_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_ingredients_company ON public.ingredients (company_id);
CREATE INDEX idx_ingredients_name ON public.ingredients (company_id, name);

CREATE TRIGGER ingredients_set_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_products_company ON public.products (company_id);
CREATE INDEX idx_products_category ON public.products (company_id, category);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- recipes (1:1 product)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  total_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  margin_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  markup NUMERIC(10, 4) NOT NULL DEFAULT 0,
  cmv_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recipes_product_unique UNIQUE (product_id)
);

CREATE INDEX idx_recipes_company ON public.recipes (company_id);

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 4) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_items_qty_positive CHECK (quantity > 0)
);

CREATE INDEX idx_recipe_items_recipe ON public.recipe_items (recipe_id);
CREATE INDEX idx_recipe_items_ingredient ON public.recipe_items (ingredient_id);
CREATE INDEX idx_recipe_items_company ON public.recipe_items (company_id);

-- inventory_movements (nunca alterar quantidade sem histórico)
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(14, 4),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_movements_type_check CHECK (
    type IN ('entrada', 'saida', 'ajuste', 'perda', 'compra', 'consumo')
  )
);

CREATE INDEX idx_inventory_movements_company ON public.inventory_movements (company_id);
CREATE INDEX idx_inventory_movements_ingredient ON public.inventory_movements (ingredient_id, created_at DESC);

-- suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  contact_name TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_company ON public.suppliers (company_id);

CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_supplier_fkey
  FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id) ON DELETE SET NULL;

CREATE TABLE public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  last_price NUMERIC(14, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_products_unique UNIQUE (supplier_id, ingredient_id)
);

CREATE TABLE public.ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers (id) ON DELETE SET NULL,
  previous_cost NUMERIC(14, 4),
  new_cost NUMERIC(14, 4) NOT NULL,
  variation_percent NUMERIC(8, 2),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingredient_price_history_ing ON public.ingredient_price_history (ingredient_id, created_at DESC);

-- purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers (id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT purchases_status_check CHECK (
    status IN ('pending', 'confirmed', 'paid', 'parcelado', 'cancelled')
  )
);

CREATE INDEX idx_purchases_company ON public.purchases (company_id, purchase_date DESC);

CREATE TRIGGER purchases_set_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_price NUMERIC(14, 4) NOT NULL,
  total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON public.purchase_items (purchase_id);

-- waste
CREATE TABLE public.waste_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients (id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  total_loss NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  employee_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  waste_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waste_reason_check CHECK (
    reason IN ('expiration', 'production_error', 'damaged', 'leftover', 'operational', 'other')
  )
);

CREATE INDEX idx_waste_company_date ON public.waste_records (company_id, waste_date DESC);

-- sales (leve — não PDV completo)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL DEFAULT 'balcao',
  payment_method TEXT,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_company_date ON public.sales (company_id, sale_date DESC);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON public.sale_items (sale_id);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  tone TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_company ON public.notifications (company_id, created_at DESC);
