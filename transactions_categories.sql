-- FinanzasApp: tablas base para movimientos y categorías.
-- Ejecutar después de confirmar el esquema actual de wallets/profiles.

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES', 'EUR')),
  payment_method TEXT NOT NULL DEFAULT 'other' CHECK (payment_method IN ('binance', 'bs', 'cash_usd', 'other')),
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comparison_bcv_usd NUMERIC(18, 2),
  comparison_cash_usd NUMERIC(18, 2),
  comparison_cash_ves NUMERIC(18, 2),
  comparison_binance_rate NUMERIC(18, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS transactions_created_by_idx
  ON transactions (created_by);

CREATE INDEX IF NOT EXISTS transactions_wallet_date_idx
  ON transactions (wallet_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_type_date_idx
  ON transactions (type, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_tag_idx
  ON transactions (tag_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags can be viewed by wallet members" ON tags;
CREATE POLICY "Tags can be viewed by wallet members"
ON tags FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = tags.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = tags.wallet_id
    AND wallet_permissions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Editors can create tags" ON tags;
CREATE POLICY "Editors can create tags"
ON tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = tags.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = tags.wallet_id
    AND wallet_permissions.user_id = auth.uid()
    AND wallet_permissions.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "Owners can update tags" ON tags;
CREATE POLICY "Owners can update tags"
ON tags FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = tags.wallet_id
    AND wallets.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = tags.wallet_id
    AND wallets.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete tags" ON tags;
CREATE POLICY "Owners can delete tags"
ON tags FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = tags.wallet_id
    AND wallets.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Transactions can be viewed by wallet members" ON transactions;
CREATE POLICY "Transactions can be viewed by wallet members"
ON transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = transactions.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = transactions.wallet_id
    AND wallet_permissions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Editors can create transactions" ON transactions;
CREATE POLICY "Editors can create transactions"
ON transactions FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = transactions.wallet_id
      AND wallets.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM wallet_permissions
      WHERE wallet_permissions.wallet_id = transactions.wallet_id
      AND wallet_permissions.user_id = auth.uid()
      AND wallet_permissions.role IN ('owner', 'editor')
    )
  )
);

CREATE OR REPLACE FUNCTION prevent_transaction_creator_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = OLD.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_creator_immutable ON transactions;
CREATE TRIGGER transactions_creator_immutable
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_transaction_creator_change();

DROP POLICY IF EXISTS "Editors can update transactions" ON transactions;
CREATE POLICY "Editors can update transactions"
ON transactions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = transactions.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = transactions.wallet_id
    AND wallet_permissions.user_id = auth.uid()
    AND wallet_permissions.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = transactions.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = transactions.wallet_id
    AND wallet_permissions.user_id = auth.uid()
    AND wallet_permissions.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "Editors can delete transactions" ON transactions;
CREATE POLICY "Editors can delete transactions"
ON transactions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = transactions.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = transactions.wallet_id
    AND wallet_permissions.user_id = auth.uid()
    AND wallet_permissions.role IN ('owner', 'editor')
  )
);
