// src/lib/bcv-scraper.ts
import * as https from 'https';
import * as cheerio from 'cheerio';

export interface BcvRates {
  usdRate: number;
  eurRate: number;
}

// Fallbacks actualizados a valores más recientes (ajustar periódicamente)
const FALLBACK_BCV_USD = 378.46;
const FALLBACK_BCV_EUR = 447.22;

export async function fetchBcvRates(): Promise<BcvRates> {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    rejectUnauthorized: false
  };

  try {
    const html = await new Promise<string>((resolve, reject) => {
      const req = https.get('https://www.bcv.org.ve/', options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      });

      req.on('error', (err) => reject(err));
    });

    const $ = cheerio.load(html);
    let usdRate = 0;
    let eurRate = 0;

    const parseValue = (text: string) => {
      const match = text.match(/(\d{1,4}[.,]\d{1,6})/);
      if (!match) return 0;
      return parseFloat(match[0].replace(',', '.'));
    };

    // Buscar tasas en contenedores específicos del BCV
    $('.dolar, .usd, [class*="dolar"], [class*="usd"], .tipo-cambio, .tasa-cambio').each((_, element) => {
      const text = $(element).text().trim();
      if (!text) return;

      const value = parseValue(text);
      if (value < 200 || value > 600) return;

      // Priorizar etiquetas que mencionen explícitamente USD/Dólar
      if (!usdRate && /USD|DÓLAR|Dolar|\$/.test(text)) {
        usdRate = value;
        console.log(`BCV USD encontrado via selector específico: ${value} en "${text}"`);
      }
    });

    // Buscar EUR con selectores específicos
    $('.euro, .eur, [class*="euro"], [class*="eur"]').each((_, element) => {
      const text = $(element).text().trim();
      if (!text) return;

      const value = parseValue(text);
      if (value < 200 || value > 600) return;

      if (!eurRate && /EUR|EURO|euro|€/.test(text)) {
        eurRate = value;
        console.log(`BCV EUR encontrado via selector específico: ${value} en "${text}"`);
      }
    });

    // Si no se encontró con selectores específicos, buscar genéricamente
    if (!usdRate) {
      $('div, span, strong, p').each((_, element) => {
        const text = $(element).text().trim();
        if (!text) return;

        const value = parseValue(text);
        if (value < 200 || value > 600) return;

        // Para USD: buscar texto con $ y palabras clave de dólar, pero excluir EUR/€
        if (!usdRate && /USD|DÓLAR|Dolar|\$/.test(text) && !/EUR|EURO|euro|€/.test(text)) {
          usdRate = value;
          console.log(`BCV USD encontrado via selector genérico: ${value} en "${text}"`);
          return false;
        }
      });
    }

    // Si no se encontró EUR, buscar genéricamente
    if (!eurRate) {
      $('div, span, strong, p').each((_, element) => {
        const text = $(element).text().trim();
        if (!text) return;

        // Para EUR: buscar texto con € y palabras clave de euro, pero excluir USD/$
        if (!eurRate && /EUR|EURO|euro|€/.test(text) && !/USD|DÓLAR|Dolar|\$/.test(text)) {
          const value = parseValue(text);
          eurRate = value;
          console.log(`BCV EUR encontrado via selector genérico: ${value} en "${text}"`);
          return false;
        }
        return undefined;
      });
    }

    if (!usdRate) usdRate = FALLBACK_BCV_USD;
    if (!eurRate) eurRate = FALLBACK_BCV_EUR;

    return { usdRate, eurRate };
  } catch (error) {
    console.error('Error al obtener tasas BCV:', error);
    return {
      usdRate: FALLBACK_BCV_USD,
      eurRate: FALLBACK_BCV_EUR
    };
  }
}
