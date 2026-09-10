import { NextResponse } from 'next/server';
import { fetchCurrentRates } from '@/lib/rates';
import { rejectProductionDiagnostics } from '@/lib/dev-only';

export async function GET() {
  const blocked = rejectProductionDiagnostics();
  if (blocked) return blocked;

  try {
    const { bcv, binance_sell, binance_buy } = await fetchCurrentRates();
    return NextResponse.json({ 
      message: 'Rates fetched successfully', 
      bcv, 
      binance_sell,
      binance_buy,
      source: 'test-endpoint'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch rates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
