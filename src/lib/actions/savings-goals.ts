'use server';

import { createClient } from '@/lib/supabase';
import type { FinancialSpaceType } from '@/lib/actions/financial-spaces';
import type { IncomeFrequency } from '@/lib/actions/income-sources';

export interface SavingsGoal {
  id: string;
  user_id: string;
  space_id: string;
  space_name: string | null;
  space_type: FinancialSpaceType | null;
  name: string;
  target_amount_usd: number;
  current_amount_usd: number;
  target_date: string | null;
  contribution_frequency: IncomeFrequency | null;
  proposed_contribution_usd: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface GoalInput {
  spaceId: string;
  name: string;
  targetAmountUsd: number;
  targetDate?: string | null;
  contributionFrequency?: IncomeFrequency | null;
  proposedContributionUsd?: number;
}

export interface SavingsContribution {
  id: string;
  savings_goal_id: string;
  account_id: string | null;
  transaction_id: string | null;
  amount_usd: number;
  contribution_date: string;
  notes: string | null;
}

const GOAL_COLUMNS =
  'id, user_id, space_id, name, target_amount_usd, current_amount_usd, target_date, contribution_frequency, proposed_contribution_usd, status, created_at, updated_at, space:financial_spaces(name, type)';

function mapGoal(row: Record<string, unknown>): SavingsGoal {
  const space = Array.isArray(row.space) ? row.space[0] : row.space;
  const typedSpace = space as { name?: string; type?: FinancialSpaceType } | null | undefined;
  return {
    ...row,
    space_name: typedSpace?.name ?? null,
    space_type: typedSpace?.type ?? null,
    target_amount_usd: Number(row.target_amount_usd) || 0,
    current_amount_usd: Number(row.current_amount_usd) || 0,
    proposed_contribution_usd: Number(row.proposed_contribution_usd) || 0,
  } as SavingsGoal;
}

export async function listSavingsGoals(): Promise<{ success: boolean; goals?: SavingsGoal[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('savings_goals')
      .select(GOAL_COLUMNS)
      .order('status')
      .order('created_at');

    if (error) return { success: false, error: error.message };
    return { success: true, goals: (data ?? []).map((row) => mapGoal(row)) };
  } catch (error) {
    console.error('listSavingsGoals error:', error);
    return { success: false, error: 'No se pudieron cargar las metas.' };
  }
}

export async function createSavingsGoal(input: GoalInput): Promise<{ success: boolean; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'La meta debe pertenecer a un espacio.' };
  if (!input.name.trim()) return { success: false, error: 'El nombre es obligatorio.' };
  if (!input.targetAmountUsd || input.targetAmountUsd <= 0) return { success: false, error: 'El monto objetivo debe ser mayor a cero.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: authData.user.id,
        space_id: input.spaceId,
        name: input.name.trim(),
        target_amount_usd: input.targetAmountUsd,
        target_date: input.targetDate || null,
        contribution_frequency: input.contributionFrequency || null,
        proposed_contribution_usd: input.proposedContributionUsd ?? 0,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('createSavingsGoal error:', error);
    return { success: false, error: 'Ocurrió un error creando la meta.' };
  }
}

export async function updateSavingsGoal(id: string, input: GoalInput & { status?: SavingsGoal['status'] }): Promise<{ success: boolean; error?: string }> {
  if (!input.name.trim()) return { success: false, error: 'El nombre es obligatorio.' };
  if (!input.targetAmountUsd || input.targetAmountUsd <= 0) return { success: false, error: 'El monto objetivo debe ser mayor a cero.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('savings_goals')
      .update({
        space_id: input.spaceId,
        name: input.name.trim(),
        target_amount_usd: input.targetAmountUsd,
        target_date: input.targetDate || null,
        contribution_frequency: input.contributionFrequency || null,
        proposed_contribution_usd: input.proposedContributionUsd ?? 0,
        ...(input.status ? { status: input.status } : {}),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('updateSavingsGoal error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la meta.' };
  }
}

export interface RecordContributionInput {
  goalId: string;
  walletId: string;
  accountId?: string | null;
  amountUsd: number;
  contributionDate?: string;
  notes?: string;
}

export async function recordSavingsContribution(input: RecordContributionInput): Promise<{ success: boolean; error?: string }> {
  if (!input.amountUsd || input.amountUsd <= 0) return { success: false, error: 'El aporte debe ser mayor a cero.' };
  if (!input.walletId) return { success: false, error: 'Selecciona la wallet de salida del dinero.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .select('id, space_id, name, current_amount_usd, target_amount_usd, status')
      .eq('id', input.goalId)
      .maybeSingle();

    if (goalError) return { success: false, error: goalError.message };
    if (!goal) return { success: false, error: 'La meta no existe o no tienes acceso.' };
    if (goal.status !== 'active') return { success: false, error: 'Solo puedes aportar a metas activas.' };

    const contributionDate = input.contributionDate ?? new Date().toISOString().slice(0, 10);

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: input.walletId,
        created_by: authData.user.id,
        account_id: input.accountId || null,
        space_id: goal.space_id,
        savings_goal_id: goal.id,
        type: 'expense',
        amount: input.amountUsd,
        currency: 'USD',
        payment_method: 'other',
        description: `Aporte meta: ${goal.name}`,
        transaction_date: contributionDate,
      })
      .select('id')
      .single();

    if (txError) return { success: false, error: `No se pudo registrar el movimiento: ${txError.message}` };

    const { error: contributionError } = await supabase
      .from('savings_contributions')
      .insert({
        savings_goal_id: goal.id,
        account_id: input.accountId || null,
        transaction_id: tx?.id ?? null,
        amount_usd: input.amountUsd,
        contribution_date: contributionDate,
        notes: input.notes?.trim() || null,
        created_by: authData.user.id,
      });

    if (contributionError) return { success: false, error: `No se pudo registrar el aporte: ${contributionError.message}` };

    const newAmount = goal.current_amount_usd + input.amountUsd;
    const completed = newAmount >= goal.target_amount_usd;

    const { error: updateError } = await supabase
      .from('savings_goals')
      .update({ current_amount_usd: newAmount, ...(completed ? { status: 'completed' } : {}) })
      .eq('id', goal.id);

    if (updateError) return { success: false, error: `El aporte se registró pero no se pudo actualizar la meta: ${updateError.message}` };
    return { success: true };
  } catch (error) {
    console.error('recordSavingsContribution error:', error);
    return { success: false, error: 'Ocurrió un error registrando el aporte.' };
  }
}

export async function listSavingsContributions(goalId: string): Promise<{ success: boolean; contributions?: SavingsContribution[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('savings_contributions')
      .select('id, savings_goal_id, account_id, transaction_id, amount_usd, contribution_date, notes')
      .eq('savings_goal_id', goalId)
      .order('contribution_date', { ascending: false })
      .limit(20);

    if (error) return { success: false, error: error.message };
    return { success: true, contributions: (data ?? []).map((row) => ({ ...row, amount_usd: Number(row.amount_usd) || 0 })) as SavingsContribution[] };
  } catch (error) {
    console.error('listSavingsContributions error:', error);
    return { success: false, error: 'No se pudo cargar el historial de aportes.' };
  }
}

export async function deleteSavingsGoal(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('savings_contributions')
      .select('id', { count: 'exact', head: true })
      .eq('savings_goal_id', id);

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) {
      return { success: false, error: 'La meta tiene aportes registrados. Elimínalos primero o marca la meta como completada.' };
    }

    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteSavingsGoal error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la meta.' };
  }
}
