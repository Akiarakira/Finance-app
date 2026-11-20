-- FinanzasApp: presupuesto 50-30-20 (pilares needs/wants/savings).
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_04.
-- La base del presupuesto viene de income-summary (budgetBase), que ya respeta
-- financial_settings.budget_base_rule.

-- 1. ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_pillar_enum') THEN
    CREATE TYPE budget_pillar_enum AS ENUM ('needs', 'wants', 'savings');
  END IF;
END $$;

-- 2. TABLA budget_categories: categorías contables por pilar
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pillar budget_pillar_enum NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budget_categories_space_idx ON budget_categories (space_id);
CREATE INDEX IF NOT EXISTS budget_categories_user_idx ON budget_categories (user_id);

-- 3. TABLA monthly_budgets: monto asignado por categoría y mes
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  assigned_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (assigned_amount_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month_year)
);

CREATE INDEX IF NOT EXISTS monthly_budgets_month_idx ON monthly_budgets (month_year);
CREATE INDEX IF NOT EXISTS monthly_budgets_category_idx ON monthly_budgets (category_id);

-- 4. RLS budget_categories
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view budget categories" ON budget_categories;
CREATE POLICY "Space members can view budget categories"
ON budget_categories FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create budget categories" ON budget_categories;
CREATE POLICY "Space editors can create budget categories"
ON budget_categories FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update budget categories" ON budget_categories;
CREATE POLICY "Space editors can update budget categories"
ON budget_categories FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can delete budget categories" ON budget_categories;
CREATE POLICY "Space editors can delete budget categories"
ON budget_categories FOR DELETE TO authenticated
USING (public.is_space_editor(space_id));

-- 5. RLS monthly_budgets: acceso por el espacio de la asignación
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view monthly budgets" ON monthly_budgets;
CREATE POLICY "Space members can view monthly budgets"
ON monthly_budgets FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can upsert monthly budgets" ON monthly_budgets;
CREATE POLICY "Space editors can upsert monthly budgets"
ON monthly_budgets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update monthly budgets" ON monthly_budgets;
CREATE POLICY "Space editors can update monthly budgets"
ON monthly_budgets FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can delete monthly budgets" ON monthly_budgets;
CREATE POLICY "Space editors can delete monthly budgets"
ON monthly_budgets FOR DELETE TO authenticated
USING (public.is_space_editor(space_id));

-- 6. Vínculo de gastos con la categoría contable
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_budget_category_idx
  ON transactions (budget_category_id);
