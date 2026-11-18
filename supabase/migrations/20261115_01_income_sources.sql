-- FinanzasApp: fuentes de ingreso (clasificación fija / variable / mixta).
-- Ejecutar en el SQL Editor de Supabase.
-- Paso 1 del plan maestro: slice vertical de income_sources.
-- Nota: space_id y destination_account_id se agregan en una migración
-- posterior, cuando existan financial_spaces y accounts.

-- 1. ENUMS (idempotentes: no fallan si el script se ejecuta dos veces)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_type_enum') THEN
    CREATE TYPE income_type_enum AS ENUM ('fixed', 'variable', 'mixed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'debt_frequency_enum') THEN
    CREATE TYPE debt_frequency_enum AS ENUM ('monthly', 'biweekly', 'weekly', 'custom');
  END IF;
END $$;

-- 2. TABLA income_sources
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  income_type income_type_enum NOT NULL,
  expected_amount_usd NUMERIC(18, 2),
  variable_component_usd NUMERIC(18, 2) DEFAULT 0.0,
  frequency debt_frequency_enum NOT NULL DEFAULT 'monthly',
  pay_day_of_month INT CHECK (pay_day_of_month BETWEEN 1 AND 31),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Regla de negocio: el monto esperado es obligatorio para fijo y mixto;
  -- para variable es opcional (estimación).
  CHECK (income_type = 'variable' OR expected_amount_usd IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS income_sources_user_idx
  ON income_sources (user_id, is_active);

-- 3. Trigger de updated_at (función genérica reutilizable por futuras tablas)
CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS income_sources_set_updated_at ON income_sources;
CREATE TRIGGER income_sources_set_updated_at
BEFORE UPDATE ON income_sources
FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

-- 4. RLS: cada usuario solo ve y administra sus propias fuentes
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own income sources" ON income_sources;
CREATE POLICY "Users can view own income sources"
ON income_sources FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own income sources" ON income_sources;
CREATE POLICY "Users can create own income sources"
ON income_sources FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own income sources" ON income_sources;
CREATE POLICY "Users can update own income sources"
ON income_sources FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own income sources" ON income_sources;
CREATE POLICY "Users can delete own income sources"
ON income_sources FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 5. Vínculo de transacciones con su fuente de ingreso
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS income_source_id UUID REFERENCES income_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_income_source_idx
  ON transactions (income_source_id);
