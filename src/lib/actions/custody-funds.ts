'use server';

import { createClient } from '@/lib/supabase';
import type { FinancialSpaceType } from '@/lib/actions/financial-spaces';

export interface CustodyFund {
  id: string;
  user_id: string;
  space_id: string;
  space_name: string | null;
  space_type: FinancialSpaceType | null;
  beneficiary_name: string;
  current_balance_usd: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustodyFundInput {
  spaceId: string;
  beneficiaryName: string;
  initialBalanceUsd?: number | null;
  notes?: string;
}

const FUND_COLUMNS =
  'id, user_id, space_id, beneficiary_name, current_balance_usd, notes, created_at, updated_at, space:financial_spaces(name, type)';

function mapFund(row: Record<string, unknown>): CustodyFund {
  const space = Array.isArray(row.space) ? row.space[0] : row.space;
  const typedSpace = space as { name?: string; type?: FinancialSpaceType } | null | undefined;
  return {
    ...row,
    space_name: typedSpace?.name ?? null,
    space_type: typedSpace?.type ?? null,
    current_balance_usd: Number(row.current_balance_usd) || 0,
  } as CustodyFund;
}

export async function listCustodyFunds(): Promise<{ success: boolean; funds?: CustodyFund[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('custody_funds')
      .select(FUND_COLUMNS)
      .order('beneficiary_name');

    if (error) return { success: false, error: error.message };
    return { success: true, funds: (data ?? []).map((row) => mapFund(row)) };
  } catch (error) {
    console.error('listCustodyFunds error:', error);
    return { success: false, error: 'No se pudieron cargar los fondos de custodia.' };
  }
}

export async function createCustodyFund(input: CustodyFundInput): Promise<{ success: boolean; fund?: CustodyFund; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'El fondo debe pertenecer a un espacio.' };
  if (!input.beneficiaryName.trim()) return { success: false, error: 'El beneficiario es obligatorio.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear fondos.' };

    const { data, error } = await supabase
      .from('custody_funds')
      .insert({
        user_id: authData.user.id,
        space_id: input.spaceId,
        beneficiary_name: input.beneficiaryName.trim(),
        current_balance_usd: input.initialBalanceUsd ?? 0,
        notes: input.notes?.trim() || null,
      })
      .select(FUND_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear el fondo.' };
    return { success: true, fund: mapFund(data) };
  } catch (error) {
    console.error('createCustodyFund error:', error);
    return { success: false, error: 'Ocurrió un error creando el fondo.' };
  }
}

export async function updateCustodyFund(id: string, input: CustodyFundInput): Promise<{ success: boolean; fund?: CustodyFund; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'El fondo debe pertenecer a un espacio.' };
  if (!input.beneficiaryName.trim()) return { success: false, error: 'El beneficiario es obligatorio.' };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('custody_funds')
      .update({
        space_id: input.spaceId,
        beneficiary_name: input.beneficiaryName.trim(),
        notes: input.notes?.trim() || null,
      })
      .eq('id', id)
      .select(FUND_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo actualizar el fondo.' };
    return { success: true, fund: mapFund(data) };
  } catch (error) {
    console.error('updateCustodyFund error:', error);
    return { success: false, error: 'Ocurrió un error actualizando el fondo.' };
  }
}

export async function deleteCustodyFund(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('custody_fund_id', id);

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) {
      return { success: false, error: 'El fondo tiene movimientos vinculados. Desvincúlalos antes de eliminarlo.' };
    }

    const { error } = await supabase.from('custody_funds').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteCustodyFund error:', error);
    return { success: false, error: 'Ocurrió un error eliminando el fondo.' };
  }
}
