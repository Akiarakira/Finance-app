// src/lib/binance-p2p.ts
import * as https from 'https';
import * as zlib from 'zlib';

export interface BinanceP2PResponse {
  code: string;
  data: {
    [key: string]: {
      asks: Array<[string, string]>;
      bids: Array<[string, string]>;
    };
  };
}

const BINANCE_ENDPOINT = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

async function fetchAds(tradeType: 'BUY' | 'SELL') {
  const payload = JSON.stringify({
    asset: 'USDT',
    fiat: 'VES',
    merchantCheck: true,
    page: 1,
    rows: 20,
    payTypes: [],
    publisherType: null,
    tradeType
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Origin': 'https://p2p.binance.com',
      'Referer': 'https://p2p.binance.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    }
  };

  const response = await new Promise<string>((resolve, reject) => {
    const req = https.request(BINANCE_ENDPOINT, options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            const encoding = res.headers['content-encoding'];
            let payload: Buffer;

            if (encoding === 'gzip') {
              payload = zlib.gunzipSync(buffer);
            } else if (encoding === 'br') {
              payload = zlib.brotliDecompressSync(buffer);
            } else if (encoding === 'deflate') {
              payload = zlib.inflateSync(buffer);
            } else {
              payload = buffer;
            }

            resolve(payload.toString('utf8'));
          } catch (decodeErr) {
            reject(decodeErr);
          }
        });
      });
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(payload);
    req.end();
  });

  console.log(`Respuesta cruda Binance P2P (${tradeType}):`, response.substring(0, 200) + '...');

  if (response.startsWith('<html>') || response.includes('<!DOCTYPE')) {
    throw new Error(`La API devolvió HTML para ${tradeType}`);
  }

  const result = JSON.parse(response);
  if (result.code !== '0' && result.code !== '000000') {
    throw new Error(`Error en API Binance ${tradeType}: ${result.code} - ${result.message || 'Error desconocido'}`);
  }

  return (result.data || []) as any[];
}

export async function fetchBinanceP2PRates() {
  try {
    // Llamamos ambos extremos: SELL (para comprar USDT) y BUY (para vender USDT)
    const [sellAds, buyAds] = await Promise.all([
      fetchAds('SELL'),
      fetchAds('BUY')
    ]);

    let bestBuyRate = 0; // Precio más bajo donde puedo comprar USDT (anuncios SELL)
    sellAds.forEach((item: any) => {
      const adv = item.adv;
      if (!adv) return;
      const price = parseFloat(adv.price);
      if (!Number.isFinite(price) || price <= 0) return;
      if (bestBuyRate === 0 || price < bestBuyRate) {
        bestBuyRate = price;
      }
    });

    let bestSellRate = 0; // Precio más alto donde puedo vender USDT (anuncios BUY)
    buyAds.forEach((item: any) => {
      const adv = item.adv;
      if (!adv) return;
      const price = parseFloat(adv.price);
      if (!Number.isFinite(price) || price <= 0) return;
      if (price > bestSellRate) {
        bestSellRate = price;
      }
    });

    console.log(`Tasas finales Binance P2P - Compra (SELL ads): ${bestBuyRate}, Venta (BUY ads): ${bestSellRate}`);

    return {
      buyRate: bestBuyRate || 395.0,
      sellRate: bestSellRate || 405.0,
      spread: (bestSellRate || 405.0) - (bestBuyRate || 395.0)
    };

  } catch (error) {
    console.error("Error al obtener tasas Binance P2P:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    
    // Valores de fallback
    return {
      buyRate: 395.0,
      sellRate: 405.0,
      spread: 10.0
    };
  }
}
