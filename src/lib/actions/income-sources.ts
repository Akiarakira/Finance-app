'use server';

import { createClient } from '@/lib/supabase';

export type IncomeType = 'fixed' | 'variable' | 'mixed';
export type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly' | 'custom';

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  income_type: IncomeType;
  expected_amount_usd: number | null;
  variable_component_usd: number | null;
  frequency: IncomeFrequency;
  pay_day_of_month: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeSourceInput {
  name: string;
  incomeType: IncomeType;
  expectedAmountUsd?: number | null;
  variableComponentUsd?: number | null;
  frequency?: IncomeFrequency;
  payDayOfMonth?: number | null;
  notes?: string;
}

const INCOME_SOURCE_COLUMNS =
  'id, user_id, name, income_type, expected_amount_usd, variable_component_usd, frequency, pay_day_of_month, is_active, notes, created_at, updated_at';

function validateInput(input: IncomeSourceInput): string | null {
  if (!input.name.trim()) return 'El nombre de la fuente es obligatorio.';
  const requiresExpected = input.incomeType === 'fixed' || input.incomeType === 'mixed';
  if (requiresExpected && (!Number.isFinite(input.expectedAmountUsd) || (input.expectedAmountUsd ?? 0) <= 0)) {
    return 'Las fuentes fijas y mixtas requieren un monto esperado mayor que cero.';
  }
  if (input.payDayOfMonth != null && (input.payDayOfMonth < 1 || input.payDayOfMonth > 31)) {
    return 'El día de cobro debe estar entre 1 y 31.';
  }
  return null;
}

export async function listIncomeSources(includeInactive = false): Promise<{ success: boolean; sources?: IncomeSource[]; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('income_sources')
      .select(INCOME_SOURCE_COLUMNS)
      .order('is_active', { ascending: false })
      .order('name');

    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, sources: (data ?? []) as IncomeSource[] };
  } catch (error) {
    console.error('listIncomeSources error:', error);
    return { success: false, error: 'No se pudieron cargar las fuentes de ingreso.' };
  }
}

export async function createIncomeSource(input: IncomeSourceInput): Promise<{ success: boolean; source?: IncomeSource; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear fuentes de ingreso.' };

    const { data, error } = await supabase
      .from('income_sources')
      .insert({
        user_id: authData.user.id,
        name: input.name.trim(),
        income_type: input.incomeType,
        expected_amount_usd: input.expectedAmountUsd ?? null,
        variable_component_usd: input.variableComponentUsd ?? null,
        frequency: input.frequency ?? 'monthly',
        pay_day_of_month: input.payDayOfMonth ?? null,
        notes: input.notes?.trim() || null,
      })
      .select(INCOME_SOURCE_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear la fuente de ingreso.' };
    return { success: true, source: data as IncomeSource };
  } catch (error) {
    console.error('createIncomeSource error:', error);
    return { success: false, error: 'Ocurrió un error creando la fuente de ingreso.' };
  }
}

export async function updateIncomeSource(id: string, input: IncomeSourceInput): Promise<{ success: boolean; source?: IncomeSource; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('income_sources')
      .update({
        name: input.name.trim(),
        income_type: input.incomeType,
        expected_amount_usd: input.expectedAmountUsd ?? null,
        variable_component_usd: input.variableComponentUsd ?? null,
        frequency: input.frequency ?? 'monthly',
        pay_day_of_month: input.payDayOfMonth ?? null,
        notes: input.notes?.trim() || null,
      })
      .eq('id', id)
      .select(INCOME_SOURCE_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo actualizar la fuente de ingreso.' };
    return { success: true, source: data as IncomeSource };
  } catch (error) {
    console.error('updateIncomeSource error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la fuente de ingreso.' };
  }
}

export async function setIncomeSourceActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('income_sources').update({ is_active: isActive }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('setIncomeSourceActive error:', error);
    return { success: false, error: 'Ocurrió un error cambiando el estado de la fuente.' };
  }
}

export async function deleteIncomeSource(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('income_sources').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteIncomeSource error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la fuente de ingreso.' };
  }
}
