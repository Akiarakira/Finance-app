-- FinanzasApp: transferencias internas / P2P entre cuentas.
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_05.
-- Una transferencia NO es ingreso ni gasto: mueve saldo entre cuentas y
-- conserva monedas y tasa resultante (ej. 100 USDT Binance -> 31.000 VES BNC).

CREATE TABLE IF NOT EXISTS internal_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  source_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  source_amount NUMERIC(18, 4) NOT NULL CHECK (source_amount > 0),
  source_currency TEXT NOT NULL CHECK (source_currency IN ('USD', 'USDT', 'VES', 'EUR')),
  destination_amount NUMERIC(18, 4) NOT NULL CHECK (destination_amount > 0),
  destination_currency TEXT NOT NULL CHECK (destination_currency IN ('USD', 'USDT', 'VES', 'EUR')),
  -- Tasa resultante = destination_amount / source_amount (u otra si se indica).
  exchange_rate NUMERIC(18, 6),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_account_id <> destination_account_id)
);

CREATE INDEX IF NOT EXISTS internal_transfers_space_idx ON internal_transfers (space_id);
CREATE INDEX IF NOT EXISTS internal_transfers_source_idx ON internal_transfers (source_account_id);
CREATE INDEX IF NOT EXISTS internal_transfers_destination_idx ON internal_transfers (destination_account_id);
CREATE INDEX IF NOT EXISTS internal_transfers_date_idx ON internal_transfers (transfer_date);

-- RLS por membresía del espacio
ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Space members can view internal transfers" ON internal_transfers;
CREATE POLICY "Space members can view internal transfers"
ON internal_transfers FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create internal transfers" ON internal_transfers;
CREATE POLICY "Space editors can create internal transfers"
ON internal_transfers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can delete internal transfers" ON internal_transfers;
CREATE POLICY "Space editors can delete internal transfers"
ON internal_transfers FOR DELETE TO authenticated
USING (public.is_space_editor(space_id));
