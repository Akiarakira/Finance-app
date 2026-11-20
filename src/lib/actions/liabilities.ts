'use server';

import { createClient } from '@/lib/supabase';
import type { FinancialSpaceType } from '@/lib/actions/financial-spaces';
import type { IncomeFrequency } from '@/lib/actions/income-sources';

export interface Liability {
  id: string;
  user_id: string;
  space_id: string;
  space_name: string | null;
  space_type: FinancialSpaceType | null;
  creditor_name: string;
  total_initial_amount_usd: number;
  current_balance_usd: number;
  installment_frequency: IncomeFrequency;
  installment_amount_usd: number;
  due_day_of_month: number | null;
  priority: number;
  is_settled: boolean;
  settled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiabilityInput {
  spaceId: string;
  creditorName: string;
  totalInitialAmountUsd: number;
  installmentFrequency?: IncomeFrequency;
  installmentAmountUsd?: number;
  dueDayOfMonth?: number | null;
  priority?: number;
  notes?: string;
}

export interface LiabilityPayment {
  id: string;
  liability_id: string;
  account_id: string | null;
  transaction_id: string | null;
  amount_usd: number;
  payment_date: string;
  notes: string | null;
}

const LIABILITY_COLUMNS =
  'id, user_id, space_id, creditor_name, total_initial_amount_usd, current_balance_usd, installment_frequency, installment_amount_usd, due_day_of_month, priority, is_settled, settled_at, notes, created_at, updated_at, space:financial_spaces(name, type)';

function mapLiability(row: Record<string, unknown>): Liability {
  const space = Array.isArray(row.space) ? row.space[0] : row.space;
  const typedSpace = space as { name?: string; type?: FinancialSpaceType } | null | undefined;
  return {
    ...row,
    space_name: typedSpace?.name ?? null,
    space_type: typedSpace?.type ?? null,
    total_initial_amount_usd: Number(row.total_initial_amount_usd) || 0,
    current_balance_usd: Number(row.current_balance_usd) || 0,
    installment_amount_usd: Number(row.installment_amount_usd) || 0,
  } as Liability;
}

export async function listLiabilities(includeSettled = false): Promise<{ success: boolean; liabilities?: Liability[]; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('liabilities')
      .select(LIABILITY_COLUMNS)
      .order('is_settled')
      .order('priority', { ascending: false })
      .order('created_at');

    if (!includeSettled) query = query.eq('is_settled', false);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, liabilities: (data ?? []).map((row) => mapLiability(row)) };
  } catch (error) {
    console.error('listLiabilities error:', error);
    return { success: false, error: 'No se pudieron cargar las deudas.' };
  }
}

export async function createLiability(input: LiabilityInput): Promise<{ success: boolean; liability?: Liability; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'La deuda debe pertenecer a un espacio.' };
  if (!input.creditorName.trim()) return { success: false, error: 'El acreedor es obligatorio.' };
  if (!input.totalInitialAmountUsd || input.totalInitialAmountUsd <= 0) {
    return { success: false, error: 'El monto total debe ser mayor a cero.' };
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear deudas.' };

    const { data, error } = await supabase
      .from('liabilities')
      .insert({
        user_id: authData.user.id,
        space_id: input.spaceId,
        creditor_name: input.creditorName.trim(),
        total_initial_amount_usd: input.totalInitialAmountUsd,
        current_balance_usd: input.totalInitialAmountUsd,
        installment_frequency: input.installmentFrequency ?? 'monthly',
        installment_amount_usd: input.installmentAmountUsd ?? 0,
        due_day_of_month: input.dueDayOfMonth ?? null,
        priority: input.priority ?? 0,
        notes: input.notes?.trim() || null,
      })
      .select(LIABILITY_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear la deuda.' };
    return { success: true, liability: mapLiability(data) };
  } catch (error) {
    console.error('createLiability error:', error);
    return { success: false, error: 'Ocurrió un error creando la deuda.' };
  }
}

export async function updateLiability(id: string, input: LiabilityInput): Promise<{ success: boolean; liability?: Liability; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'La deuda debe pertenecer a un espacio.' };
  if (!input.creditorName.trim()) return { success: false, error: 'El acreedor es obligatorio.' };
  if (!input.totalInitialAmountUsd || input.totalInitialAmountUsd <= 0) {
    return { success: false, error: 'El monto total debe ser mayor a cero.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('liabilities')
      .update({
        space_id: input.spaceId,
        creditor_name: input.creditorName.trim(),
        total_initial_amount_usd: input.totalInitialAmountUsd,
        installment_frequency: input.installmentFrequency ?? 'monthly',
        installment_amount_usd: input.installmentAmountUsd ?? 0,
        due_day_of_month: input.dueDayOfMonth ?? null,
        priority: input.priority ?? 0,
        notes: input.notes?.trim() || null,
      })
      .eq('id', id)
      .select(LIABILITY_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo actualizar la deuda.' };
    return { success: true, liability: mapLiability(data) };
  } catch (error) {
    console.error('updateLiability error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la deuda.' };
  }
}

export interface RecordPaymentInput {
  liabilityId: string;
  walletId: string;
  accountId?: string | null;
  amountUsd: number;
  paymentDate?: string;
  notes?: string;
}

export async function recordLiabilityPayment(input: RecordPaymentInput): Promise<{ success: boolean; error?: string }> {
  if (!input.amountUsd || input.amountUsd <= 0) return { success: false, error: 'El monto del pago debe ser mayor a cero.' };
  if (!input.walletId) return { success: false, error: 'Selecciona la wallet de salida del dinero.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { data: liability, error: liabilityError } = await supabase
      .from('liabilities')
      .select('id, space_id, creditor_name, current_balance_usd, is_settled')
      .eq('id', input.liabilityId)
      .maybeSingle();

    if (liabilityError) return { success: false, error: liabilityError.message };
    if (!liability) return { success: false, error: 'La deuda no existe o no tienes acceso.' };
    if (liability.is_settled) return { success: false, error: 'Esta deuda ya está saldada.' };
    if (input.amountUsd > liability.current_balance_usd) {
      return { success: false, error: `El pago supera el saldo restante ($${liability.current_balance_usd.toFixed(2)}).` };
    }

    const paymentDate = input.paymentDate ?? new Date().toISOString().slice(0, 10);

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: input.walletId,
        created_by: authData.user.id,
        account_id: input.accountId || null,
        space_id: liability.space_id,
        liability_id: liability.id,
        type: 'expense',
        amount: input.amountUsd,
        currency: 'USD',
        payment_method: 'other',
        description: `Pago deuda: ${liability.creditor_name}`,
        transaction_date: paymentDate,
      })
      .select('id')
      .single();

    if (txError) return { success: false, error: `No se pudo registrar el movimiento: ${txError.message}` };
    const transactionId = tx?.id ?? null;

    const { error: paymentError } = await supabase
      .from('liability_payments')
      .insert({
        liability_id: liability.id,
        account_id: input.accountId || null,
        transaction_id: transactionId,
        amount_usd: input.amountUsd,
        payment_date: paymentDate,
        notes: input.notes?.trim() || null,
        created_by: authData.user.id,
      });

    if (paymentError) return { success: false, error: `No se pudo registrar el pago: ${paymentError.message}` };

    const newBalance = Math.max(0, liability.current_balance_usd - input.amountUsd);
    const settled = newBalance === 0;

    const { error: updateError } = await supabase
      .from('liabilities')
      .update({
        current_balance_usd: newBalance,
        is_settled: settled,
        settled_at: settled ? new Date().toISOString() : null,
      })
      .eq('id', liability.id);

    if (updateError) return { success: false, error: `El pago se registró pero no se pudo actualizar el saldo: ${updateError.message}` };
    return { success: true };
  } catch (error) {
    console.error('recordLiabilityPayment error:', error);
    return { success: false, error: 'Ocurrió un error registrando el pago.' };
  }
}

export async function listLiabilityPayments(liabilityId: string): Promise<{ success: boolean; payments?: LiabilityPayment[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('liability_payments')
      .select('id, liability_id, account_id, transaction_id, amount_usd, payment_date, notes')
      .eq('liability_id', liabilityId)
      .order('payment_date', { ascending: false })
      .limit(20);

    if (error) return { success: false, error: error.message };
    return { success: true, payments: (data ?? []).map((row) => ({ ...row, amount_usd: Number(row.amount_usd) || 0 })) as LiabilityPayment[] };
  } catch (error) {
    console.error('listLiabilityPayments error:', error);
    return { success: false, error: 'No se pudo cargar el historial de pagos.' };
  }
}

export async function deleteLiability(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('liability_payments')
      .select('id', { count: 'exact', head: true })
      .eq('liability_id', id);

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) {
      return { success: false, error: 'La deuda tiene pagos registrados. Elimínalos primero o salda la deuda.' };
    }

    const { error } = await supabase.from('liabilities').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteLiability error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la deuda.' };
  }
}
