import PaymentComparator from '@/components/PaymentComparator';
import { listAccessibleWallets } from '@/lib/actions/transactions';
import { createClient } from '@/lib/supabase';

export default async function ComparePage() {
  const supabase = await createClient();
  const walletsResult = await listAccessibleWallets();
  const { data: bcvRate } = await supabase
    .from('exchange_rates')
    .select('usd_bcv, created_at')
    .eq('source', 'BCV')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: binanceRate } = await supabase
    .from('exchange_rates')
    .select('binance_sell_rate, created_at')
    .eq('source', 'Binance')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Comparar forma de pago</h1>
        <p className="text-slate-500">Calcula si conviene pagar en Binance/Binance Pay, Bs o efectivo.</p>
      </div>
      <PaymentComparator
        initialBcvRate={Number(bcvRate?.usd_bcv ?? 0)}
        initialBinanceRate={Number(binanceRate?.binance_sell_rate ?? 0)}
        wallets={walletsResult.wallets ?? []}
      />
    </div>
  );
}
