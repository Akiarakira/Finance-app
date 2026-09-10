import { NextResponse } from 'next/server';
import { rejectProductionDiagnostics } from '@/lib/dev-only';

export async function GET() {
  const blocked = rejectProductionDiagnostics();
  if (blocked) return blocked;

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
}
