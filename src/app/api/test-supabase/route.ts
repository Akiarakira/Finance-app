import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { rejectProductionDiagnostics } from '@/lib/dev-only';

export async function GET() {
  const blocked = rejectProductionDiagnostics();
  if (blocked) return blocked;

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
