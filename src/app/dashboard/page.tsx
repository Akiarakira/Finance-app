// src/app/dashboard/page.tsx
import { Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getMonthlySummary, listTransactions } from '@/lib/actions/transactions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [summaryResult, transactionsResult] = await Promise.all([
    getMonthlySummary(currentMonth),
    listTransactions(),
  ]);

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