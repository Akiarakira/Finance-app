import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = await createClient();
  
  try {
    // Usar una consulta SQL directa para ver las columnas de la tabla
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(0);
    
    if (error) {
      // Si hay error, intentar obtener información de las tablas disponibles
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      return NextResponse.json({ 
        error: 'Error al consultar exchange_rates',
        details: error.message,
        availableTables: tables,
        tablesError: tablesError?.message
      }, { status: 500 });
    }

    // La consulta anterior no da info de columnas, intentemos con diferentes nombres de columna comunes
    const commonColumns = ['price', 'value', 'amount', 'rate', 'tasa', 'valor'];
    const results: Record<string, string> = {};

    for (const column of commonColumns) {
      try {
        const { data: testData, error: testError } = await supabase
          .from('exchange_rates')
          .select(`source, ${column}`)
          .limit(1);
        
        results[column] = testError ? 'ERROR' : 'EXISTS';
      } catch (e) {
        results[column] = 'ERROR';
      }
    }

    return NextResponse.json({ 
      message: 'Verificación de columnas en exchange_rates',
      columnTest: results,
      dataSample: data
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: 'Error general',
      details: err
    }, { status: 500 });
  }
}
