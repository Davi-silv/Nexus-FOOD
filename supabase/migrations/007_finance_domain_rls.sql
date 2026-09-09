-- Nexus Food — Domínio financeiro + RLS (Fases 12 / 16)
-- categories, transactions, accounts_payable, accounts_receivable

CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_categories_type_check CHECK (type IN ('income', 'expense'))
);

CREATE INDEX idx_finance_categories_company ON public.finance_categories (company_id);

CREATE TRIGGER finance_categories_set_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL,
  payment_method TEXT,
  category_id UUID REFERENCES public.finance_categories (id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_transactions_type_check CHECK (type IN ('income', 'expense'))
);

CREATE INDEX idx_finance_transactions_company ON public.finance_transactions (company_id);
CREATE INDEX idx_finance_transactions_date ON public.finance_transactions (company_id, date);

CREATE TRIGGER finance_transactions_set_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  supplier_name TEXT,
  category_id UUID REFERENCES public.finance_categories (id) ON DELETE SET NULL,
  purchase_id UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_payable_status_check CHECK (
    status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')
  )
);

CREATE INDEX idx_accounts_payable_company ON public.accounts_payable (company_id);
CREATE INDEX idx_accounts_payable_due ON public.accounts_payable (company_id, due_date);

CREATE TRIGGER accounts_payable_set_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  received_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  category_id UUID REFERENCES public.finance_categories (id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_receivable_status_check CHECK (
    status IN ('pending', 'partial', 'received', 'overdue', 'cancelled')
  )
);

CREATE INDEX idx_accounts_receivable_company ON public.accounts_receivable (company_id);
CREATE INDEX idx_accounts_receivable_due ON public.accounts_receivable (company_id, due_date);

CREATE TRIGGER accounts_receivable_set_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: leitura para membros; escrita exige finance (ou company admin)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_categories',
    'finance_transactions',
    'accounts_payable',
    'accounts_receivable'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (public.is_company_member(company_id))',
      t || '_select', t
    );

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
      t || '_write', t, 'finance', 'finance'
    );
  END LOOP;
END $$;
