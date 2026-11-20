-- FinanzasApp: fondos de custodia (dinero administrado para terceros, ej. Mami).
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_01.
-- Un depósito al fondo suma su saldo sin ser ingreso del hogar; una compra para
-- el beneficiario descuenta el fondo sin contar como gasto del hogar.

-- 1. TABLA custody_funds
CREATE TABLE IF NOT EXISTS custody_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  beneficiary_name TEXT NOT NULL,
  -- Saldo inicial declarado; el saldo real = current_balance_usd
  -- + depósitos vinculados - compras vinculadas.
  current_balance_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custody_funds_space_idx
  ON custody_funds (space_id);
CREATE INDEX IF NOT EXISTS custody_funds_user_idx
  ON custody_funds (user_id);

-- 2. Trigger de updated_at
DROP TRIGGER IF EXISTS custody_funds_set_updated_at ON custody_funds;
CREATE TRIGGER custody_funds_set_updated_at
BEFORE UPDATE ON custody_funds
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

-- 3. RLS por membresía del espacio (mismo patrón que accounts)
ALTER TABLE custody_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view custody funds" ON custody_funds;
CREATE POLICY "Space members can view custody funds"
ON custody_funds FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create custody funds" ON custody_funds;
CREATE POLICY "Space editors can create custody funds"
ON custody_funds FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update custody funds" ON custody_funds;
CREATE POLICY "Space editors can update custody funds"
ON custody_funds FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space admins can delete custody funds" ON custody_funds;
CREATE POLICY "Space admins can delete custody funds"
ON custody_funds FOR DELETE TO authenticated
USING (public.is_space_admin(space_id));

-- 4. Vínculo de movimientos con el fondo
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS custody_fund_id UUID REFERENCES custody_funds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_custody_fund_idx
  ON transactions (custody_fund_id);
