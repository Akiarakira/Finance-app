// src/app/dashboard/page.tsx
import { Wallet, TrendingUp, ArrowRight, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import CreateWalletModal from '@/components/CreateWalletModal';

export default async function DashboardPage() {
  const supabase = createClient();

  // Traemos la última tasa de BCV
  const { data: rates } = await (await supabase)
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
  const { data: binanceRates } = await (await supabase)
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
      {/* Header con tasas actualizadas */}
      <header className="flex justify-between items-center py-4">
        <p className="text-slate-500">Hoy: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        <div className="flex items-center gap-4">
          <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">BCV: {bcvRate.toFixed(2)}</span>
          <span className="bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">BIN Venta: {latestBinanceSell.toFixed(2)}</span>
          <span className="bg-lime-100 text-lime-700 text-sm font-medium px-3 py-1 rounded-full">BIN Compra: {latestBinanceBuy.toFixed(2)}</span>

          <button className="text-slate-400 hover:text-slate-600">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">JD</div>
            <span className="text-slate-700">Usuario</span>
          </div>
        </div>
      </header>

      {/* Header de bienvenida + acción */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hola de nuevo 👋</h1>
          <p className="text-slate-500">Aquí tienes el resumen de tus finanzas hoy.</p>
        </div>
        <CreateWalletModal />
      </div>

      {/* Grid de Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Wallet size={24} />
            </div>
            <span className="text-xs font-medium text-slate-400">Total Balance</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">$0.00</h3>
          <p className="text-sm text-slate-500 mt-1">≈ 0.00 BS</p>
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

      {/* Placeholder para transacciones recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Últimos movimientos</h3>
        <div className="text-center py-10 text-slate-400">
          <p>Aún no tienes transacciones registradas.</p>
        </div>
      </div>
    </div>
  );
}