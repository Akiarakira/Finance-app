-- FinanzasApp: fecha de actualización e historial de wallets.
-- Ejecutar en Supabase después de confirmar las políticas actuales.

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE wallets
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS wallet_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_name TEXT,
  old_description TEXT,
  new_name TEXT,
  new_description TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_history_wallet_date_idx
  ON wallet_history (wallet_id, changed_at DESC);

CREATE OR REPLACE FUNCTION set_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_set_updated_at ON wallets;
CREATE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION set_wallet_updated_at();

CREATE OR REPLACE FUNCTION record_wallet_history()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wallet_history (
      wallet_id, changed_by, action, new_name, new_description
    ) VALUES (
      NEW.id, auth.uid(), 'created', NEW.name, NEW.description
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO wallet_history (
      wallet_id, changed_by, action,
      old_name, old_description, new_name, new_description
    ) VALUES (
      NEW.id, auth.uid(), 'updated',
      OLD.name, OLD.description, NEW.name, NEW.description
    );
    RETURN NEW;
  END IF;

  INSERT INTO wallet_history (
    wallet_id, changed_by, action, old_name, old_description
  ) VALUES (
    OLD.id, auth.uid(), 'deleted', OLD.name, OLD.description
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_record_history ON wallets;
CREATE TRIGGER wallets_record_history
AFTER INSERT OR UPDATE OR DELETE ON wallets
FOR EACH ROW EXECUTE FUNCTION record_wallet_history();

ALTER TABLE wallet_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wallet members can view wallet history" ON wallet_history;
CREATE POLICY "Wallet members can view wallet history"
ON wallet_history FOR SELECT TO authenticated
USING (
  wallet_history.changed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_history.wallet_id
    AND wallets.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM wallet_permissions
    WHERE wallet_permissions.wallet_id = wallet_history.wallet_id
    AND wallet_permissions.user_id = auth.uid()
  )
);
