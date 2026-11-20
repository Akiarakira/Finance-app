-- FinanzasApp: metas de ahorro e historial de aportes.
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_06.
-- Un aporte descuenta la wallet/cuenta de origen vía transactions y suma al
-- current_amount_usd de la meta. Es "gasto" hacia ahorro, no consumo.

-- 1. TABLA savings_goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount_usd NUMERIC(18, 2) NOT NULL CHECK (target_amount_usd > 0),
  current_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0 CHECK (current_amount_usd >= 0),
  target_date DATE,
  contribution_frequency debt_frequency_enum,
  proposed_contribution_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_goals_space_idx ON savings_goals (space_id);
CREATE INDEX IF NOT EXISTS savings_goals_user_idx ON savings_goals (user_id);

DROP TRIGGER IF EXISTS savings_goals_set_updated_at ON savings_goals;
CREATE TRIGGER savings_goals_set_updated_at
BEFORE UPDATE ON savings_goals
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

-- 2. TABLA savings_contributions
CREATE TABLE IF NOT EXISTS savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  savings_goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount_usd NUMERIC(18, 2) NOT NULL CHECK (amount_usd > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_contributions_goal_idx ON savings_contributions (savings_goal_id);
CREATE INDEX IF NOT EXISTS savings_contributions_date_idx ON savings_contributions (contribution_date);

-- 3. RLS savings_goals
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view savings goals" ON savings_goals;
CREATE POLICY "Space members can view savings goals"
ON savings_goals FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create savings goals" ON savings_goals;
CREATE POLICY "Space editors can create savings goals"
ON savings_goals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update savings goals" ON savings_goals;
CREATE POLICY "Space editors can update savings goals"
ON savings_goals FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space admins can delete savings goals" ON savings_goals;
CREATE POLICY "Space admins can delete savings goals"
ON savings_goals FOR DELETE TO authenticated
USING (public.is_space_admin(space_id));

-- 4. RLS savings_contributions: acceso por el espacio de la meta padre
ALTER TABLE savings_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view savings contributions" ON savings_contributions;
CREATE POLICY "Space members can view savings contributions"
ON savings_contributions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM savings_goals g
    WHERE g.id = savings_goal_id AND public.is_space_member(g.space_id)
  )
);

DROP POLICY IF EXISTS "Space editors can create savings contributions" ON savings_contributions;
CREATE POLICY "Space editors can create savings contributions"
ON savings_contributions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM savings_goals g
    WHERE g.id = savings_goal_id AND public.is_space_editor(g.space_id)
  )
);

DROP POLICY IF EXISTS "Space editors can delete savings contributions" ON savings_contributions;
CREATE POLICY "Space editors can delete savings contributions"
ON savings_contributions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM savings_goals g
    WHERE g.id = savings_goal_id AND public.is_space_editor(g.space_id)
  )
);

-- 5. Vínculo de movimientos con la meta
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_savings_goal_idx
  ON transactions (savings_goal_id);
