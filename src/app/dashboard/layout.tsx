import Sidebar from '@/components/Sidebar';
import { Bell, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Fetch latest exchange rates
  const { data: bcvRates } = await supabase
    .from('exchange_rates')
    .select('usd_bcv, eur_bcv, created_at')
    .eq('source', 'BCV')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: binanceRates } = await supabase
    .from('exchange_rates')
    .select('binance_sell_rate, binance_buy_rate, created_at')
    .eq('source', 'Binance')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const bcvRate = bcvRates?.usd_bcv || 0;
  const bcvEurRate = bcvRates?.eur_bcv || 0;
  const binanceSellRate = binanceRates?.binance_sell_rate || 0;
  const binanceBuyRate = binanceRates?.binance_buy_rate || 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Fijo */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">Hoy: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Widget de Tasas (Visualización rápida) */}
            <div className="flex gap-2 text-xs font-bold">
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded">BCV: {bcvRate > 0 ? bcvRate.toFixed(2) : 'Cargando...'}</span>
              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">EUR: {bcvEurRate > 0 ? bcvEurRate.toFixed(2) : 'Cargando...'}</span>
              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">BIN V: {binanceSellRate > 0 ? binanceSellRate.toFixed(2) : 'Cargando...'}</span>
              <span className="text-lime-600 bg-lime-50 px-2 py-1 rounded">BIN C: {binanceBuyRate > 0 ? binanceBuyRate.toFixed(2) : 'Cargando...'}</span>
            </div>
            
            <button className="text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                JD
              </div>
              <span className="text-sm font-medium text-slate-700">Usuario</span>
            </div>
          </div>
        </header>

        {/* Contenido de la Página */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}