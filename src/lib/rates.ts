// src/lib/rates.ts
import { fetchBcvRates } from './bcv-scraper';
import { fetchBinanceP2PRates } from './binance-p2p-service';

export async function fetchCurrentRates() {
  try {
    const { usdRate, eurRate } = await fetchBcvRates();
    // Obtener tasas reales de Binance P2P
    const binanceRates = await fetchBinanceP2PRates();

    console.log(`Tasas Binance P2P - Compra: ${binanceRates.buyRate}, Venta: ${binanceRates.sellRate}`);

    return { 
      bcv: usdRate, 
      bcv_eur: eurRate,
      binance_sell: binanceRates.sellRate,
      binance_buy: binanceRates.buyRate,
      binance_spread: binanceRates.spread
    };
    
  } catch (error) {
    console.error("Error al obtener tasas:", error);
    // Valores de fallback cuando la API no está disponible
    return { 
      bcv: 378.46, 
      bcv_eur: 447.22,
      binance_sell: 397.38,
      binance_buy: 395.0,
      binance_spread: 10.0
    };
  }
}