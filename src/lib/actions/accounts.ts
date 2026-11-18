'use server';

import { createClient } from '@/lib/supabase';
import type { FinancialSpaceType } from '@/lib/actions/financial-spaces';

export type AccountType = 'binance' | 'bank_ves' | 'mobile_pay_ves' | 'digital_usd' | 'foreign_bank' | 'cash';
export type AccountCurrency = 'USD' | 'USDT' | 'VES' | 'EUR';

export interface Account {
  id: string;
  user_id: string;
  space_id: string;
  space_name: string | null;
  space_type: FinancialSpaceType | null;
  name: string;
  type: AccountType;
  currency: AccountCurrency;
  current_balance: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountInput {
  spaceId: string;
  name: string;
  type: AccountType;
  currency: AccountCurrency;
  initialBalance?: number | null;
}

export interface AccountUpdateInput {
  spaceId: string;
  name: string;
  type: AccountType;
  currency: AccountCurrency;
}

const ACCOUNT_COLUMNS =
  'id, user_id, space_id, name, type, currency, current_balance, is_active, archived_at, created_at, updated_at, space:financial_spaces(name, type)';

function validateInput(input: { spaceId: string; name: string }): string | null {
  if (!input.spaceId) return 'La cuenta debe pertenecer a un espacio.';
  if (!input.name.trim()) return 'El nombre de la cuenta es obligatorio.';
  return null;
}

function mapAccount(row: Record<string, unknown>): Account {
  const space = Array.isArray(row.space) ? row.space[0] : row.space;
  const typedSpace = space as { name?: string; type?: FinancialSpaceType } | null | undefined;
  return {
    ...row,
    space_name: typedSpace?.name ?? null,
    space_type: typedSpace?.type ?? null,
    current_balance: Number(row.current_balance) || 0,
  } as Account;
}

export async function listAccounts(includeArchived = false): Promise<{ success: boolean; accounts?: Account[]; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('accounts')
      .select(ACCOUNT_COLUMNS)
      .order('is_active', { ascending: false })
      .order('name');

    if (!includeArchived) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, accounts: (data ?? []).map((row) => mapAccount(row)) };
  } catch (error) {
    console.error('listAccounts error:', error);
    return { success: false, error: 'No se pudieron cargar las cuentas.' };
  }
}

export async function createAccount(input: AccountInput): Promise<{ success: boolean; account?: Account; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear cuentas.' };

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: authData.user.id,
        space_id: input.spaceId,
        name: input.name.trim(),
        type: input.type,
        currency: input.currency,
        current_balance: input.initialBalance ?? 0,
      })
      .select(ACCOUNT_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear la cuenta.' };
    return { success: true, account: mapAccount(data) };
  } catch (error) {
    console.error('createAccount error:', error);
    return { success: false, error: 'Ocurrió un error creando la cuenta.' };
  }
}

export async function updateAccount(id: string, input: AccountUpdateInput): Promise<{ success: boolean; account?: Account; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('accounts')
      .update({
        space_id: input.spaceId,
        name: input.name.trim(),
        type: input.type,
        currency: input.currency,
      })
      .eq('id', id)
      .select(ACCOUNT_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo actualizar la cuenta.' };
    return { success: true, account: mapAccount(data) };
  } catch (error) {
    console.error('updateAccount error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la cuenta.' };
  }
}

export async function setAccountArchived(id: string, archived: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: !archived, archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('setAccountArchived error:', error);
    return { success: false, error: 'Ocurrió un error cambiando el estado de la cuenta.' };
  }
}

export async function deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const [{ count: transactionCount, error: transactionsError }, { count: sourceCount, error: sourcesError }] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('account_id', id),
      supabase.from('income_sources').select('id', { count: 'exact', head: true }).eq('destination_account_id', id),
    ]);

    if (transactionsError || sourcesError) {
      return { success: false, error: transactionsError?.message ?? sourcesError?.message ?? 'No se pudo verificar el uso de la cuenta.' };
    }
    if ((transactionCount ?? 0) > 0 || (sourceCount ?? 0) > 0) {
      return { success: false, error: 'La cuenta tiene movimientos o fuentes vinculadas. Archívala en lugar de eliminarla.' };
    }

    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteAccount error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la cuenta.' };
  }
}
