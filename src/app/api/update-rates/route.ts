import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase'; // Asegúrate que esté en src/lib
import { fetchCurrentRates } from '@/lib/rates';

export async function GET() {
  const supabase = await createClient();
  const { bcv, bcv_eur, binance_sell, binance_buy } = await fetchCurrentRates();

  if (bcv <= 0) {
    return NextResponse.json({ error: 'No se pudieron obtener las tasas' }, { status: 500 });
  }

  // Obtener las tasas anteriores para mantener valores
  const { data: lastRates, error: fetchError } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2);

  const lastBcv = lastRates?.find(r => r.source === 'BCV');
  const lastBinance = lastRates?.find(r => r.source === 'Binance');

  // Insertamos en la tabla exchange_rates manteniendo tasas anteriores
  const moment = new Date().toISOString();
  
  const { error } = await supabase
    .from('exchange_rates')
    .insert([
      { 
        source: 'BCV', 
        usd_bcv: bcv, 
        eur_bcv: bcv_eur,
        binance_sell_rate: lastBcv?.binance_sell_rate || binance_sell,
        binance_buy_rate: lastBcv?.binance_buy_rate || binance_buy,
        moment: moment
      },
      { 
        source: 'Binance', 
        usd_bcv: lastBinance?.usd_bcv || bcv,           // Mantener tasa anterior o usar BCV actual
        eur_bcv: lastBinance?.eur_bcv || bcv_eur,       // Mantener tasa anterior o usar EUR actual
        binance_sell_rate: binance_sell,
        binance_buy_rate: binance_buy,
        moment: moment
      }
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ 
    message: 'Tasas actualizadas', 
    bcv_usd: bcv, 
    bcv_eur: bcv_eur,
    binance_sell: binance_sell,
    binance_buy: binance_buy,
    previous_rates: {
      bcv: lastBcv,
      binance: lastBinance
    }
  });
}