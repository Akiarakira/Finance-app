// src/app/dashboard/page.tsx
import { Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getMonthlySummary, listTransactions } from '@/lib/actions/transactions';
import { getIncomePeriodSummary } from '@/lib/actions/income-summary';
import { listCustodyFunds } from '@/lib/actions/custody-funds';
import { listLiabilities } from '@/lib/actions/liabilities';
import { getBudgetSummary, PILLAR_LABELS } from '@/lib/actions/budget';

export default async function DashboardPage() {
  const supabase = await createClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [summaryResult, transactionsResult, incomeResult, fundsResult, liabilitiesResult, budgetResult] = await Promise.all([
    getMonthlySummary(currentMonth),
    listTransactions(),
    getIncomePeriodSummary(currentMonth),
    listCustodyFunds(),
    listLiabilities(),
    getBudgetSummary(currentMonth),
  ]);

  const incomeSummary = incomeResult.summary;
  const custodyFunds = fundsResult.funds ?? [];
  const liabilities = liabilitiesResult.liabilities ?? [];
  const budgetSummary = budgetResult.summary;

  const custodyMovements = custodyFunds.length > 0
    ? await supabase
        .from('transactions')
        .select('custody_fund_id, type, amount')
        .in('custody_fund_id', custodyFunds.map((fund) => fund.id))
    : { data: [] };

  const custodyTotals = new Map<string, number>(custodyFunds.map((fund) => [fund.id, fund.current_balance_usd]));
  for (const movement of custodyMovements.data ?? []) {
    if (!movement.custody_fund_id) continue;
    const amount = Number(movement.amount) || 0;
    const current = custodyTotals.get(movement.custody_fund_id) ?? 0;
    custodyTotals.set(movement.custody_fund_id, movement.type === 'income' ? current + amount : current - amount);
  }

  // Traemos la última tasa de BCV
  const { data: rates } = await supabase
    .from('exchange_rates')
    .select('usd_bcv, eur_bcv, binance_sell_rate, binance_buy_rate, created_at')
    .eq('source', 'BCV')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const bcvRate = rates?.usd_bcv || 0;
  const bcvEurRate = rates?.eur_bcv || 0;

  const binanceSellRate = rates?.binance_sell_rate || 0;
  const binanceBuyRate = rates?.binance_buy_rate || 0;

  // También obtenemos la última tasa de Binance directamente de su registro
  const { data: binanceRates } = await supabase
    .from('exchange_rates')
    .select('binance_sell_rate, binance_buy_rate, created_at')
    .eq('source', 'Binance')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const latestBinanceSell = binanceRates?.binance_sell_rate || binanceSellRate;
  const latestBinanceBuy = binanceRates?.binance_buy_rate || binanceBuyRate;

  return (
    <div className="space-y-8">
      {/* Grid de Resumen Rápido */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Wallet size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Balance del mes</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{summaryResult.summary?.balance.toFixed(2) ?? '0.00'} USD</h3>
          <p className="text-sm text-slate-500 mt-1">Ingresos: {summaryResult.summary?.income.toFixed(2) ?? '0.00'} · Gastos: {summaryResult.summary?.expenses.toFixed(2) ?? '0.00'}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Tasa BCV USD</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{bcvRate > 0 ? `${bcvRate} BS` : 'Cargando...'}</h3>
          <p className="text-sm text-green-600 mt-1">{rates ? `Actualizado: ${new Date(rates.created_at).toLocaleTimeString()}` : ''}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Tasa BCV EUR</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{bcvEurRate > 0 ? `${bcvEurRate} BS` : 'Cargando...'}</h3>
          <p className="text-sm text-purple-600 mt-1">{rates ? `Actualizado: ${new Date(rates.created_at).toLocaleTimeString()}` : ''}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Binance Venta</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{latestBinanceSell > 0 ? `${latestBinanceSell} BS` : 'Cargando...'}</h3>
          <p className="text-sm text-orange-600 mt-1">{binanceRates ? `Actualizado: ${new Date(binanceRates.created_at).toLocaleTimeString()}` : ''}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-lime-50 rounded-lg text-lime-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Binance Compra</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{latestBinanceBuy > 0 ? `${latestBinanceBuy} BS` : 'Cargando...'}</h3>
          <p className="text-sm text-lime-600 mt-1">{binanceRates ? `Actualizado: ${new Date(binanceRates.created_at).toLocaleTimeString()}` : ''}</p>
        </div>
      </div>

      {incomeSummary && (incomeSummary.bySource.length > 0 || incomeSummary.receivedTotal > 0) && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">Ingresos del mes</h3>
            <Link href="/dashboard/income" className="text-sm font-medium text-blue-600 hover:underline">Ver ingresos</Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Fijo recibido vs. esperado</p>
              <p className="text-xl font-bold text-slate-800">
                ${incomeSummary.fixedReceived.toFixed(2)} <span className="text-sm font-normal text-slate-400">de ${incomeSummary.expectedFixedTotal.toFixed(2)}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${incomeSummary.expectedFixedTotal > 0 ? Math.min((incomeSummary.fixedReceived / incomeSummary.expectedFixedTotal) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-500">Estabilidad del mes</p>
              <p className="text-xl font-bold text-slate-800">
                {incomeSummary.stabilityRatio != null ? `${Math.round(incomeSummary.stabilityRatio * 100)}% fijo` : 'Sin datos'}
              </p>
              <p className="text-sm text-slate-500">Variable: ${incomeSummary.variableReceived.toFixed(2)} · Promedio 3m: ${incomeSummary.variableMonthlyAverage.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Base sugerida 50-30-20</p>
              <p className="text-xl font-bold text-slate-800">${incomeSummary.budgetBase.toFixed(2)}</p>
              <p className="text-sm text-slate-500">
                ${(incomeSummary.budgetBase * 0.5).toFixed(2)} nec. · ${(incomeSummary.budgetBase * 0.3).toFixed(2)} deseos · ${(incomeSummary.budgetBase * 0.2).toFixed(2)} ahorro
              </p>
            </div>
          </div>

          {incomeSummary.pendingSources.length > 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Cobros pendientes: {incomeSummary.pendingSources.map((stat) => `${stat.name} (faltan $${stat.pending.toFixed(2)}${stat.payDay != null ? `, día ${stat.payDay}` : ''})`).join(' · ')}
            </p>
          )}
          {incomeSummary.surplusVariable > 0 && (
            <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
              Excedente variable de ${incomeSummary.surplusVariable.toFixed(2)} sobre tu promedio — candidato a ahorro o adelanto de deuda.
            </p>
          )}
          {incomeSummary.unlinkedReceived > 0 && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              ${incomeSummary.unlinkedReceived.toFixed(2)} recibidos sin fuente asignada.
            </p>
          )}
        </div>
      )}

      {custodyFunds.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">Fondos de custodia</h3>
            <Link href="/dashboard/accounts" className="text-sm font-medium text-blue-600 hover:underline">Administrar</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {custodyFunds.map((fund) => (
              <div key={fund.id} className="rounded-lg border border-purple-100 bg-purple-50/50 p-4">
                <p className="text-sm text-slate-500">{fund.beneficiary_name}</p>
                <p className="text-xl font-bold text-slate-800">${(custodyTotals.get(fund.id) ?? fund.current_balance_usd).toFixed(2)}</p>
                <p className="text-xs text-slate-400">Disponible · {fund.space_name ?? 'Sin espacio'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {budgetSummary && budgetSummary.categories.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">Presupuesto del mes</h3>
            <Link href="/dashboard/budget" className="text-sm font-medium text-blue-600 hover:underline">Administrar</Link>
          </div>
          <div className="space-y-4">
            {(['needs', 'wants', 'savings'] as const).map((pillar) => {
              const data = budgetSummary.pillars[pillar];
              const labels = PILLAR_LABELS[pillar];
              const spentPct = data.assigned > 0 ? Math.min(100, (data.spent / data.assigned) * 100) : 0;
              const overBudget = data.assigned > 0 && data.spent > data.assigned;
              return (
                <div key={pillar}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className={`font-medium ${labels.color}`}>{labels.name} ({labels.pct})</span>
                    <span className="text-slate-500">
                      ${data.spent.toFixed(2)} / ${data.assigned.toFixed(2)}
                      <span className="text-xs text-slate-400"> · objetivo ${data.target.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${overBudget ? 'bg-red-500' : pillar === 'needs' ? 'bg-sky-500' : pillar === 'wants' ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${spentPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {liabilities.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800">Deudas activas</h3>
            <Link href="/dashboard/debts" className="text-sm font-medium text-blue-600 hover:underline">Administrar</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {liabilities.map((liability) => {
              const paidPct = liability.total_initial_amount_usd > 0
                ? Math.min(100, ((liability.total_initial_amount_usd - liability.current_balance_usd) / liability.total_initial_amount_usd) * 100)
                : 0;
              return (
                <div key={liability.id} className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                  <p className="text-sm text-slate-500">{liability.creditor_name}</p>
                  <p className="text-xl font-bold text-slate-800">${liability.current_balance_usd.toFixed(2)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{paidPct.toFixed(0)}% pagado{liability.due_day_of_month ? ` · vence día ${liability.due_day_of_month}` : ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800">Últimos movimientos</h3>
          <Link href="/dashboard/reports" className="text-sm font-medium text-blue-600 hover:underline">Ver estado de cuenta</Link>
        </div>
        {(transactionsResult.transactions ?? []).length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <p>Aún no tienes transacciones registradas.</p>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <Link href="/dashboard/income" className="text-green-600 hover:underline">Registrar ingreso</Link>
              <Link href="/dashboard/expenses" className="text-blue-600 hover:underline">Registrar gasto</Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(transactionsResult.transactions ?? []).slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-800">{transaction.description || 'Movimiento sin descripción'}</p>
                  <p className="text-sm text-slate-500">{transaction.category_name ?? 'Sin categoría'} · {transaction.transaction_date}</p>
                  <p className="text-xs text-slate-400">Registrado por: {transaction.created_by_name ?? transaction.created_by_email ?? transaction.created_by}</p>
                </div>
                <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                  {transaction.type === 'income' ? '+' : '-'} {transaction.amount.toFixed(2)} {transaction.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}