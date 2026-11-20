'use server';

import { createClient } from '@/lib/supabase';
import type { IncomeFrequency, IncomeType } from '@/lib/actions/income-sources';

export type SourcePeriodStatus = 'received' | 'partial' | 'pending' | 'variable';

export interface SourcePeriodStat {
  sourceId: string;
  name: string;
  incomeType: IncomeType;
  expected: number;
  received: number;
  pending: number;
  fixedPart: number;
  variablePart: number;
  status: SourcePeriodStatus;
  payDay: number | null;
}

export interface IncomePeriodSummary {
  month: string;
  expectedFixedTotal: number;
  expectedVariableEstimate: number;
  receivedTotal: number;
  fixedReceived: number;
  variableReceived: number;
  unlinkedReceived: number;
  pendingFixedTotal: number;
  stabilityRatio: number | null;
  variableMonthlyAverage: number;
  budgetBase: number;
  surplusVariable: number;
  pendingSources: SourcePeriodStat[];
  bySource: SourcePeriodStat[];
}

interface IncomeSourceRow {
  id: string;
  name: string;
  income_type: IncomeType;
  expected_amount_usd: number | null;
  frequency: IncomeFrequency;
  pay_day_of_month: number | null;
}

interface IncomeTxRow {
  amount: number;
  currency: string;
  income_source_id: string | null;
  custody_fund_id: string | null;
  transaction_date: string;
}

const PERIODS_PER_MONTH: Record<IncomeFrequency, number> = {
  monthly: 1,
  biweekly: 2,
  weekly: 4,
  custom: 1,
};

function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

function monthEnd(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export async function getIncomePeriodSummary(month?: string): Promise<{ success: boolean; summary?: IncomePeriodSummary; error?: string }> {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) return { success: false, error: 'El mes no tiene un formato válido.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para ver el resumen.' };

    const rangeStart = `${shiftMonth(targetMonth, -2)}-01`;
    const rangeEnd = monthEnd(targetMonth);

    const [sourcesResult, txResult, settingsResult, ratesResult] = await Promise.all([
      supabase
        .from('income_sources')
        .select('id, name, income_type, expected_amount_usd, frequency, pay_day_of_month')
        .eq('is_active', true),
      supabase
        .from('transactions')
        .select('amount, currency, income_source_id, custody_fund_id, transaction_date')
        .eq('type', 'income')
        .gte('transaction_date', rangeStart)
        .lt('transaction_date', rangeEnd),
      supabase
        .from('financial_settings')
        .select('budget_base_rule')
        .eq('user_id', authData.user.id)
        .is('space_id', null)
        .maybeSingle(),
      supabase
        .from('exchange_rates')
        .select('usd_bcv, eur_bcv')
        .eq('source', 'BCV')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (sourcesResult.error) return { success: false, error: sourcesResult.error.message };
    if (txResult.error) return { success: false, error: txResult.error.message };

    const sources = (sourcesResult.data ?? []) as IncomeSourceRow[];
    const movements = (txResult.data ?? []) as IncomeTxRow[];
    const usdBcv = Number(ratesResult.data?.usd_bcv) || 0;
    const eurBcv = Number(ratesResult.data?.eur_bcv) || 0;

    // Conversión provisional con la última tasa BCV disponible hasta que
    // exista la configuración de referencia cambiaria por usuario.
    const toUsd = (amount: number, currency: string): number => {
      if (currency === 'VES') return usdBcv > 0 ? amount / usdBcv : amount;
      if (currency === 'EUR') return usdBcv > 0 && eurBcv > 0 ? amount * (eurBcv / usdBcv) : amount;
      return amount;
    };

    const monthOf = (date: string) => date.slice(0, 7);
    const months = [shiftMonth(targetMonth, -2), shiftMonth(targetMonth, -1), targetMonth];

    const receivedByMonthSource = new Map<string, number>();
    const unlinkedByMonth = new Map<string, number>();
    for (const tx of movements) {
      // Los depósitos a custodia no son ingreso del hogar.
      if (tx.custody_fund_id) continue;
      const key = monthOf(tx.transaction_date);
      const usd = toUsd(Number(tx.amount) || 0, tx.currency);
      if (tx.income_source_id) {
        const mapKey = `${key}:${tx.income_source_id}`;
        receivedByMonthSource.set(mapKey, (receivedByMonthSource.get(mapKey) ?? 0) + usd);
      } else {
        unlinkedByMonth.set(key, (unlinkedByMonth.get(key) ?? 0) + usd);
      }
    }

    const statsForMonth = (m: string) => {
      let expectedFixed = 0;
      let fixed = 0;
      let variable = unlinkedByMonth.get(m) ?? 0;
      const stats: SourcePeriodStat[] = sources.map((source) => {
        const periods = PERIODS_PER_MONTH[source.frequency] ?? 1;
        const base = Number(source.expected_amount_usd) || 0;
        const expected = source.income_type === 'variable' ? 0 : base * periods;
        const received = receivedByMonthSource.get(`${m}:${source.id}`) ?? 0;
        const fixedPart = Math.min(received, expected);
        const variablePart = Math.max(received - expected, 0);
        const pending = Math.max(expected - received, 0);

        expectedFixed += expected;
        if (source.income_type === 'variable') variable += received;
        else {
          fixed += fixedPart;
          variable += variablePart;
        }

        const status: SourcePeriodStatus = source.income_type === 'variable'
          ? 'variable'
          : pending === 0 ? 'received' : received > 0 ? 'partial' : 'pending';

        return {
          sourceId: source.id,
          name: source.name,
          incomeType: source.income_type,
          expected,
          received,
          pending,
          fixedPart,
          variablePart,
          status,
          payDay: source.pay_day_of_month,
        };
      });
      return { stats, expectedFixed, fixed, variable };
    };

    const current = statsForMonth(targetMonth);
    const variableTotals = months.map((m) => m === targetMonth ? current.variable : statsForMonth(m).variable);
    const variableMonthlyAverage = variableTotals.reduce((sum, v) => sum + v, 0) / months.length;

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const todayDay = targetMonth === currentMonthKey ? new Date().getUTCDate() : 32;
    const isFutureMonth = targetMonth > currentMonthKey;

    const pendingSources = isFutureMonth
      ? []
      : current.stats.filter((stat) =>
          stat.incomeType !== 'variable' && stat.pending > 0 && (stat.payDay == null || stat.payDay <= todayDay));

    const receivedTotal = current.fixed + current.variable;
    const expectedVariableEstimate = sources
      .filter((source) => source.income_type === 'variable')
      .reduce((sum, source) => sum + (Number(source.expected_amount_usd) || 0) * (PERIODS_PER_MONTH[source.frequency] ?? 1), 0);

    // Regla de base presupuestaria configurable en /dashboard/settings.
    const budgetBaseRule = (settingsResult.data?.budget_base_rule as string | undefined) ?? 'average';
    const budgetBase = budgetBaseRule === 'fixed_only'
      ? current.expectedFixed
      : budgetBaseRule === 'expected'
        ? current.expectedFixed + expectedVariableEstimate
        : current.expectedFixed + variableMonthlyAverage;

    return {
      success: true,
      summary: {
        month: targetMonth,
        expectedFixedTotal: current.expectedFixed,
        expectedVariableEstimate,
        receivedTotal,
        fixedReceived: current.fixed,
        variableReceived: current.variable,
        unlinkedReceived: unlinkedByMonth.get(targetMonth) ?? 0,
        pendingFixedTotal: pendingSources.reduce((sum, stat) => sum + stat.pending, 0),
        stabilityRatio: receivedTotal > 0 ? current.fixed / receivedTotal : null,
        variableMonthlyAverage,
        budgetBase,
        surplusVariable: Math.max(current.variable - variableMonthlyAverage, 0),
        pendingSources,
        bySource: current.stats,
      },
    };
  } catch (error) {
    console.error('getIncomePeriodSummary error:', error);
    return { success: false, error: 'No se pudo calcular el resumen de ingresos.' };
  }
}
