import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test basic connection
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        error: 'Supabase connection failed',
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Supabase connection successful',
      data 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
