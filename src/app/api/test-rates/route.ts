import { NextResponse } from 'next/server';
import { fetchCurrentRates } from '@/lib/rates';

export async function GET() {
  try {
    const { bcv, binance } = await fetchCurrentRates();
    return NextResponse.json({ 
      message: 'Rates fetched successfully', 
      bcv, 
      binance,
      source: 'test-endpoint'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch rates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
