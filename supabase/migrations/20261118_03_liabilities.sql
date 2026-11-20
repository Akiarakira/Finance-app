-- FinanzasApp: deudas externas (pasivos) e historial de pagos.
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_02.
-- Un pago de deuda descuenta liabilities.current_balance_usd y, si se registra
-- cuenta de salida, también el saldo de esa cuenta vía transactions.

-- 1. TABLA liabilities
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  total_initial_amount_usd NUMERIC(18, 2) NOT NULL,
  current_balance_usd NUMERIC(18, 2) NOT NULL,
  installment_frequency debt_frequency_enum NOT NULL DEFAULT 'monthly',
  installment_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0,
  due_day_of_month INT CHECK (due_day_of_month BETWEEN 1 AND 31),
  priority INT NOT NULL DEFAULT 0,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS liabilities_space_idx ON liabilities (space_id);
CREATE INDEX IF NOT EXISTS liabilities_user_idx ON liabilities (user_id);

DROP TRIGGER IF EXISTS liabilities_set_updated_at ON liabilities;
CREATE TRIGGER liabilities_set_updated_at
BEFORE UPDATE ON liabilities
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

-- 2. TABLA liability_payments
CREATE TABLE IF NOT EXISTS liability_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount_usd NUMERIC(18, 2) NOT NULL CHECK (amount_usd > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS liability_payments_liability_idx
  ON liability_payments (liability_id);
CREATE INDEX IF NOT EXISTS liability_payments_date_idx
  ON liability_payments (payment_date);

-- 3. RLS liabilities (mismo patrón que accounts / custody_funds)
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view liabilities" ON liabilities;
CREATE POLICY "Space members can view liabilities"
ON liabilities FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create liabilities" ON liabilities;
CREATE POLICY "Space editors can create liabilities"
ON liabilities FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update liabilities" ON liabilities;
CREATE POLICY "Space editors can update liabilities"
ON liabilities FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space admins can delete liabilities" ON liabilities;
CREATE POLICY "Space admins can delete liabilities"
ON liabilities FOR DELETE TO authenticated
USING (public.is_space_admin(space_id));

-- 4. RLS liability_payments: acceso por el espacio de la deuda padre
ALTER TABLE liability_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view liability payments" ON liability_payments;
CREATE POLICY "Space members can view liability payments"
ON liability_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM liabilities l
    WHERE l.id = liability_id AND public.is_space_member(l.space_id)
  )
);

DROP POLICY IF EXISTS "Space editors can create liability payments" ON liability_payments;
CREATE POLICY "Space editors can create liability payments"
ON liability_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM liabilities l
    WHERE l.id = liability_id AND public.is_space_editor(l.space_id)
  )
);

DROP POLICY IF EXISTS "Space editors can delete liability payments" ON liability_payments;
CREATE POLICY "Space editors can delete liability payments"
ON liability_payments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM liabilities l
    WHERE l.id = liability_id AND public.is_space_editor(l.space_id)
  )
);

-- 5. Vínculo de movimientos con la deuda
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS liability_id UUID REFERENCES liabilities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_liability_idx
  ON transactions (liability_id);
