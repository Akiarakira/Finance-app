-- FinanzasApp: regla de base presupuestaria en financial_settings.
-- Ejecutar en el SQL Editor de Supabase, después de 20261118_03.
-- fixed_only: solo ingreso fijo garantizado.
-- expected:   fijo esperado + variable esperado del periodo.
-- average:    fijo esperado + promedio móvil variable (3 meses).

ALTER TABLE financial_settings
  ADD COLUMN IF NOT EXISTS budget_base_rule TEXT NOT NULL DEFAULT 'average'
    CHECK (budget_base_rule IN ('fixed_only', 'expected', 'average'));
