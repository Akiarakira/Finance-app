'use server';

import { createClient } from '@/lib/supabase';

export type ValuationCurrency = 'USD' | 'USDT';
export type ValuationRateSource = 'bcv_usd' | 'binance_usdt' | 'bcv_eur' | 'custom';
export type BudgetBaseRule = 'fixed_only' | 'expected' | 'average';

export interface FinancialSettings {
  id: string;
  user_id: string;
  space_id: string | null;
  valuation_currency: ValuationCurrency;
  valuation_rate_source: ValuationRateSource;
  custom_rate: number | null;
  budget_base_rule: BudgetBaseRule;
  timezone: string;
}

export interface FinancialSettingsInput {
  valuationCurrency: ValuationCurrency;
  valuationRateSource: ValuationRateSource;
  customRate?: number | null;
  budgetBaseRule: BudgetBaseRule;
  timezone: string;
}

export const DEFAULT_SETTINGS: Omit<FinancialSettings, 'id' | 'user_id' | 'space_id'> = {
  valuation_currency: 'USDT',
  valuation_rate_source: 'binance_usdt',
  custom_rate: null,
  budget_base_rule: 'average',
  timezone: 'America/Caracas',
};

/** Preferencias globales del usuario (space_id NULL). Los overrides por espacio quedan para más adelante. */
export async function getFinancialSettings(): Promise<{ success: boolean; settings?: FinancialSettings; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { data, error } = await supabase
      .from('financial_settings')
      .select('id, user_id, space_id, valuation_currency, valuation_rate_source, custom_rate, budget_base_rule, timezone')
      .eq('user_id', authData.user.id)
      .is('space_id', null)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) {
      return {
        success: true,
        settings: { id: '', user_id: authData.user.id, space_id: null, ...DEFAULT_SETTINGS },
      };
    }
    return { success: true, settings: { ...data, custom_rate: data.custom_rate === null ? null : Number(data.custom_rate) } as FinancialSettings };
  } catch (error) {
    console.error('getFinancialSettings error:', error);
    return { success: false, error: 'No se pudieron cargar las preferencias.' };
  }
}

export async function upsertFinancialSettings(input: FinancialSettingsInput): Promise<{ success: boolean; error?: string }> {
  if (input.valuationRateSource === 'custom' && (!input.customRate || input.customRate <= 0)) {
    return { success: false, error: 'Con referencia personalizada debes indicar la tasa (VES por unidad).' };
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { error } = await supabase
      .from('financial_settings')
      .upsert(
        {
          user_id: authData.user.id,
          space_id: null,
          valuation_currency: input.valuationCurrency,
          valuation_rate_source: input.valuationRateSource,
          custom_rate: input.valuationRateSource === 'custom' ? input.customRate : null,
          budget_base_rule: input.budgetBaseRule,
          timezone: input.timezone.trim() || 'America/Caracas',
        },
        { onConflict: 'user_id,space_id' },
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('upsertFinancialSettings error:', error);
    return { success: false, error: 'No se pudieron guardar las preferencias.' };
  }
}
