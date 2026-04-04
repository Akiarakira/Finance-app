import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { fetchCurrentRates } from '@/lib/rates';

export async function GET() {
  try {
    const supabase = await createClient();
    const { bcv, binance } = await fetchCurrentRates();

    // Test insertion with detailed error handling
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert([
        { source: 'BCV', rate: bcv },
        { source: 'Binance', rate: binance }
      ])
      .select();

    if (error) {
      return NextResponse.json({ 
        error: 'Insertion failed',
        details: error.message,
        code: error.code,
        details_full: error.details
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Insertion successful',
      data 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
