import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { rejectProductionDiagnostics } from '@/lib/dev-only';

export async function GET() {
  const blocked = rejectProductionDiagnostics();
  if (blocked) return blocked;

  const supabase = await createClient();
  
  try {
    // Verificar si RLS está habilitado
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('information_schema.table_policies')
      .select('policy_name, permissive, roles, cmd, qual')
      .eq('table_name', 'exchange_rates')
      .eq('table_schema', 'public');

    // Intentar insertar con service role key (si existe)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const serviceClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
          auth: { persistSession: false },
        }
      );
      
      const { data: insertData, error: insertError } = await serviceClient
        .from('exchange_rates')
        .insert([
          { source: 'TEST', usd_bcv: 1.0, eur_bcv: 1.0 }
        ])
        .select();

      return NextResponse.json({
        message: 'Diagnóstico RLS',
        rlsStatus: rlsStatus,
        rlsError: rlsError?.message,
        serviceKeyTest: {
          success: !insertError,
          data: insertData,
          error: insertError?.message
        }
      });
    }

    return NextResponse.json({
      message: 'Diagnóstico RLS',
      rlsStatus: rlsStatus,
      rlsError: rlsError?.message,
      note: 'No se encontró SUPABASE_SERVICE_ROLE_KEY'
    });

  } catch (err) {
    return NextResponse.json({
      error: 'Error en diagnóstico',
      details: err
    }, { status: 500 });
  }
}
