-- FinanzasApp: espacios financieros y cuentas.
-- Ejecutar en el SQL Editor de Supabase.
-- Slice estructural del plan maestro: financial_spaces, financial_space_members,
-- accounts y financial_settings. Custodia, deudas y presupuesto dependen de estas tablas.

-- 1. ENUMS (idempotentes: no fallan si el script se ejecuta dos veces)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_space_type_enum') THEN
    CREATE TYPE financial_space_type_enum AS ENUM ('personal', 'household', 'custody', 'shared');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE account_type_enum AS ENUM ('binance', 'bank_ves', 'mobile_pay_ves', 'digital_usd', 'foreign_bank', 'cash');
  END IF;
END $$;

-- 2. ESPACIOS FINANCIEROS Y MEMBRESÍAS
CREATE TABLE IF NOT EXISTS financial_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type financial_space_type_enum NOT NULL DEFAULT 'personal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, user_id)
);

-- 3. CUENTAS FINANCIERAS
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES financial_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type_enum NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'USDT', 'VES', 'EUR')),
  -- current_balance guarda el saldo inicial declarado; el saldo real se
  -- calcula como current_balance + movimientos vinculados (account_id).
  current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PREFERENCIAS DE VALORACIÓN POR USUARIO/ESPACIO
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES financial_spaces(id) ON DELETE CASCADE,
  valuation_currency TEXT NOT NULL DEFAULT 'USDT'
    CHECK (valuation_currency IN ('USD', 'USDT')),
  valuation_rate_source TEXT NOT NULL DEFAULT 'binance_usdt'
    CHECK (valuation_rate_source IN ('bcv_usd', 'binance_usdt', 'bcv_eur', 'custom')),
  custom_rate NUMERIC(18, 6),
  timezone TEXT NOT NULL DEFAULT 'America/Caracas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE(user_id, space_id) con space_id nullable: Postgres trata NULL como
-- distinto, así que la unicidad de la fila global del usuario necesita COALESCE.
CREATE UNIQUE INDEX IF NOT EXISTS financial_settings_user_space_unique
  ON financial_settings (user_id, COALESCE(space_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS financial_spaces_owner_idx
  ON financial_spaces (owner_id, is_active);
CREATE INDEX IF NOT EXISTS financial_space_members_space_idx
  ON financial_space_members (space_id);
CREATE INDEX IF NOT EXISTS financial_space_members_user_idx
  ON financial_space_members (user_id);
CREATE INDEX IF NOT EXISTS accounts_space_idx
  ON accounts (space_id, is_active);
CREATE INDEX IF NOT EXISTS accounts_user_idx
  ON accounts (user_id);

-- 6. Triggers de updated_at (reutiliza set_row_updated_at de la migración anterior)
DROP TRIGGER IF EXISTS financial_spaces_set_updated_at ON financial_spaces;
CREATE TRIGGER financial_spaces_set_updated_at
BEFORE UPDATE ON financial_spaces
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS accounts_set_updated_at ON accounts;
CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS financial_settings_set_updated_at ON financial_settings;
CREATE TRIGGER financial_settings_set_updated_at
BEFORE UPDATE ON financial_settings
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

-- 7. HELPERS SECURITY DEFINER
-- Consultan las tablas sin reevaluar sus policies: evita la recursión
-- financial_spaces <-> financial_space_members (mismo patrón que wallets).
CREATE OR REPLACE FUNCTION public.is_space_member(target_space_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_spaces
    WHERE financial_spaces.id = target_space_id
      AND financial_spaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.financial_space_members
    WHERE financial_space_members.space_id = target_space_id
      AND financial_space_members.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_space_editor(target_space_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_spaces
    WHERE financial_spaces.id = target_space_id
      AND financial_spaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.financial_space_members
    WHERE financial_space_members.space_id = target_space_id
      AND financial_space_members.user_id = auth.uid()
      AND financial_space_members.role IN ('owner', 'admin', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_space_admin(target_space_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_spaces
    WHERE financial_spaces.id = target_space_id
      AND financial_spaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.financial_space_members
    WHERE financial_space_members.space_id = target_space_id
      AND financial_space_members.user_id = auth.uid()
      AND financial_space_members.role IN ('owner', 'admin')
  );
$$;

-- 8. RLS
ALTER TABLE financial_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

-- financial_spaces
DROP POLICY IF EXISTS "Space members can view spaces" ON financial_spaces;
CREATE POLICY "Space members can view spaces"
ON financial_spaces FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_space_member(id));

DROP POLICY IF EXISTS "Users can create their spaces" ON financial_spaces;
CREATE POLICY "Users can create their spaces"
ON financial_spaces FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Space admins can update spaces" ON financial_spaces;
CREATE POLICY "Space admins can update spaces"
ON financial_spaces FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.is_space_admin(id))
WITH CHECK (owner_id = auth.uid() OR public.is_space_admin(id));

DROP POLICY IF EXISTS "Space owners can delete spaces" ON financial_spaces;
CREATE POLICY "Space owners can delete spaces"
ON financial_spaces FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- financial_space_members
DROP POLICY IF EXISTS "Space members can view members" ON financial_space_members;
CREATE POLICY "Space members can view members"
ON financial_space_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space admins can add members" ON financial_space_members;
CREATE POLICY "Space admins can add members"
ON financial_space_members FOR INSERT TO authenticated
WITH CHECK (public.is_space_admin(space_id));

DROP POLICY IF EXISTS "Space admins can update members" ON financial_space_members;
CREATE POLICY "Space admins can update members"
ON financial_space_members FOR UPDATE TO authenticated
USING (public.is_space_admin(space_id))
WITH CHECK (public.is_space_admin(space_id));

DROP POLICY IF EXISTS "Space admins or self can remove members" ON financial_space_members;
CREATE POLICY "Space admins or self can remove members"
ON financial_space_members FOR DELETE TO authenticated
USING (public.is_space_admin(space_id) OR user_id = auth.uid());

-- accounts
DROP POLICY IF EXISTS "Space members can view accounts" ON accounts;
CREATE POLICY "Space members can view accounts"
ON accounts FOR SELECT TO authenticated
USING (public.is_space_member(space_id));

DROP POLICY IF EXISTS "Space editors can create accounts" ON accounts;
CREATE POLICY "Space editors can create accounts"
ON accounts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space editors can update accounts" ON accounts;
CREATE POLICY "Space editors can update accounts"
ON accounts FOR UPDATE TO authenticated
USING (public.is_space_editor(space_id))
WITH CHECK (public.is_space_editor(space_id));

DROP POLICY IF EXISTS "Space admins can delete accounts" ON accounts;
CREATE POLICY "Space admins can delete accounts"
ON accounts FOR DELETE TO authenticated
USING (public.is_space_admin(space_id));

-- financial_settings: preferencias privadas de cada usuario
DROP POLICY IF EXISTS "Users can view own settings" ON financial_settings;
CREATE POLICY "Users can view own settings"
ON financial_settings FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own settings" ON financial_settings;
CREATE POLICY "Users can create own settings"
ON financial_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settings" ON financial_settings;
CREATE POLICY "Users can update own settings"
ON financial_settings FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own settings" ON financial_settings;
CREATE POLICY "Users can delete own settings"
ON financial_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 9. EXTENSIONES DE TABLAS EXISTENTES
ALTER TABLE income_sources
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES financial_spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS income_sources_space_idx
  ON income_sources (space_id);

-- Una fuente vinculada a un espacio compartido la ven también sus miembros.
DROP POLICY IF EXISTS "Space members can view income sources" ON income_sources;
CREATE POLICY "Space members can view income sources"
ON income_sources FOR SELECT TO authenticated
USING (space_id IS NOT NULL AND public.is_space_member(space_id));

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES financial_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_account_idx
  ON transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_space_idx
  ON transactions (space_id);

-- USDT pasa a ser moneda válida en movimientos.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_currency_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_currency_check CHECK (currency IN ('USD', 'USDT', 'VES', 'EUR'));
