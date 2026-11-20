'use server';

import { createClient } from '@/lib/supabase';
import type { FinancialSpaceType } from '@/lib/actions/financial-spaces';
import { getIncomePeriodSummary } from '@/lib/actions/income-summary';

export type BudgetPillar = 'needs' | 'wants' | 'savings';

export interface BudgetCategory {
  id: string;
  user_id: string;
  space_id: string;
  space_name: string | null;
  space_type: FinancialSpaceType | null;
  name: string;
  pillar: BudgetPillar;
  icon: string | null;
}

export interface CategoryInput {
  spaceId: string;
  name: string;
  pillar: BudgetPillar;
  icon?: string;
}

export interface BudgetSummary {
  month: string;
  budgetBase: number;
  pillars: Record<BudgetPillar, { target: number; assigned: number; spent: number }>;
  categories: { category: BudgetCategory; assigned: number; spent: number }[];
}

export const PILLAR_TARGET_RATIO: Record<BudgetPillar, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

export const PILLAR_LABELS: Record<BudgetPillar, { name: string; pct: string; color: string; bg: string; border: string }> = {
  needs: { name: 'Necesidades', pct: '50%', color: 'text-sky-700', bg: 'bg-sky-50/60', border: 'border-sky-100' },
  wants: { name: 'Deseos', pct: '30%', color: 'text-violet-700', bg: 'bg-violet-50/60', border: 'border-violet-100' },
  savings: { name: 'Ahorro', pct: '20%', color: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-100' },
};

const CATEGORY_COLUMNS = 'id, user_id, space_id, name, pillar, icon, space:financial_spaces(name, type)';

function mapCategory(row: Record<string, unknown>): BudgetCategory {
  const space = Array.isArray(row.space) ? row.space[0] : row.space;
  const typedSpace = space as { name?: string; type?: FinancialSpaceType } | null | undefined;
  return { ...row, space_name: typedSpace?.name ?? null, space_type: typedSpace?.type ?? null } as BudgetCategory;
}

export async function listBudgetCategories(): Promise<{ success: boolean; categories?: BudgetCategory[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('budget_categories')
      .select(CATEGORY_COLUMNS)
      .order('pillar')
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, categories: (data ?? []).map((row) => mapCategory(row)) };
  } catch (error) {
    console.error('listBudgetCategories error:', error);
    return { success: false, error: 'No se pudieron cargar las categorías de presupuesto.' };
  }
}

export async function createBudgetCategory(input: CategoryInput): Promise<{ success: boolean; error?: string }> {
  if (!input.spaceId) return { success: false, error: 'La categoría debe pertenecer a un espacio.' };
  if (!input.name.trim()) return { success: false, error: 'El nombre es obligatorio.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { error } = await supabase
      .from('budget_categories')
      .insert({
        user_id: authData.user.id,
        space_id: input.spaceId,
        name: input.name.trim(),
        pillar: input.pillar,
        icon: input.icon?.trim() || null,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('createBudgetCategory error:', error);
    return { success: false, error: 'Ocurrió un error creando la categoría.' };
  }
}

export async function updateBudgetCategory(id: string, input: CategoryInput): Promise<{ success: boolean; error?: string }> {
  if (!input.name.trim()) return { success: false, error: 'El nombre es obligatorio.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('budget_categories')
      .update({ name: input.name.trim(), pillar: input.pillar, icon: input.icon?.trim() || null, space_id: input.spaceId })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('updateBudgetCategory error:', error);
    return { success: false, error: 'Ocurrió un error actualizando la categoría.' };
  }
}

export async function deleteBudgetCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('budget_category_id', id);

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) {
      return { success: false, error: 'La categoría tiene movimientos vinculados. Desvincúlalos antes de eliminarla.' };
    }

    const { error } = await supabase.from('budget_categories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteBudgetCategory error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la categoría.' };
  }
}

/** Guarda la asignación mensual de una categoría (upsert por usuario+categoría+mes). */
export async function upsertMonthlyBudget(categoryId: string, month: string, assignedUsd: number): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, error: 'El mes no tiene un formato válido.' };
  if (assignedUsd < 0) return { success: false, error: 'La asignación no puede ser negativa.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, space_id')
      .eq('id', categoryId)
      .maybeSingle();

    if (categoryError) return { success: false, error: categoryError.message };
    if (!category) return { success: false, error: 'La categoría no existe o no tienes acceso.' };

    const { error } = await supabase
      .from('monthly_budgets')
      .upsert(
        {
          user_id: authData.user.id,
          space_id: category.space_id,
          category_id: categoryId,
          month_year: `${month}-01`,
          assigned_amount_usd: assignedUsd,
        },
        { onConflict: 'user_id,category_id,month_year' },
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('upsertMonthlyBudget error:', error);
    return { success: false, error: 'Ocurrió un error guardando la asignación.' };
  }
}

/** Resumen del presupuesto del mes: base sugerida, objetivo/asignado/gastado por pilar y por categoría. */
export async function getBudgetSummary(month: string): Promise<{ success: boolean; summary?: BudgetSummary; error?: string }> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { success: false, error: 'El mes no tiene un formato válido.' };

  try {
    const supabase = await createClient();
    const monthStart = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const monthEnd = endDate.toISOString().slice(0, 10);

    const [categoriesResult, budgetsResult, txResult, incomeResult, ratesResult] = await Promise.all([
      supabase.from('budget_categories').select(CATEGORY_COLUMNS).order('pillar').order('name'),
      supabase.from('monthly_budgets').select('category_id, assigned_amount_usd').eq('month_year', monthStart),
      supabase
        .from('transactions')
        .select('amount, currency, budget_category_id')
        .eq('type', 'expense')
        .not('budget_category_id', 'is', null)
        .gte('transaction_date', monthStart)
        .lt('transaction_date', monthEnd),
      getIncomePeriodSummary(month),
      supabase.from('exchange_rates').select('usd_bcv, eur_bcv').eq('source', 'BCV').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (categoriesResult.error) return { success: false, error: categoriesResult.error.message };
    if (budgetsResult.error) return { success: false, error: budgetsResult.error.message };
    if (txResult.error) return { success: false, error: txResult.error.message };

    const usdBcv = Number(ratesResult.data?.usd_bcv) || 0;
    const eurBcv = Number(ratesResult.data?.eur_bcv) || 0;
    const toUsd = (amount: number, currency: string): number => {
      if (currency === 'VES') return usdBcv > 0 ? amount / usdBcv : amount;
      if (currency === 'EUR') return usdBcv > 0 && eurBcv > 0 ? amount * (eurBcv / usdBcv) : amount;
      return amount;
    };

    const assignedByCategory = new Map<string, number>();
    for (const row of budgetsResult.data ?? []) {
      assignedByCategory.set(row.category_id, Number(row.assigned_amount_usd) || 0);
    }

    const spentByCategory = new Map<string, number>();
    for (const tx of txResult.data ?? []) {
      if (!tx.budget_category_id) continue;
      const usd = toUsd(Number(tx.amount) || 0, tx.currency);
      spentByCategory.set(tx.budget_category_id, (spentByCategory.get(tx.budget_category_id) ?? 0) + usd);
    }

    const categories = (categoriesResult.data ?? []).map((row) => {
      const category = mapCategory(row);
      return {
        category,
        assigned: assignedByCategory.get(category.id) ?? 0,
        spent: spentByCategory.get(category.id) ?? 0,
      };
    });

    const budgetBase = incomeResult.summary?.budgetBase ?? 0;
    const pillars = (Object.keys(PILLAR_TARGET_RATIO) as BudgetPillar[]).reduce((acc, pillar) => {
      const inPillar = categories.filter((item) => item.category.pillar === pillar);
      acc[pillar] = {
        target: budgetBase * PILLAR_TARGET_RATIO[pillar],
        assigned: inPillar.reduce((sum, item) => sum + item.assigned, 0),
        spent: inPillar.reduce((sum, item) => sum + item.spent, 0),
      };
      return acc;
    }, {} as BudgetSummary['pillars']);

    return { success: true, summary: { month, budgetBase, pillars, categories } };
  } catch (error) {
    console.error('getBudgetSummary error:', error);
    return { success: false, error: 'No se pudo calcular el presupuesto.' };
  }
}
