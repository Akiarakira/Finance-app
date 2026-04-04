import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const supabase = await createClient();
  
  try {
    // Intentar obtener un registro para ver la estructura
    const { data: sampleData, error: selectError } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(1);
    
    if (selectError) {
      return NextResponse.json({ 
        error: 'Error al seleccionar datos',
        details: selectError.message,
        hint: selectError.hint
      }, { status: 500 });
    }

    // Intentar insertar un registro de prueba para ver qué columnas espera
    const testRecord = {
      source: 'TEST',
      rate: 1.0,
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('exchange_rates')
      .insert(testRecord)
      .select()
      .single();

    return NextResponse.json({ 
      message: 'Verificación de esquema exchange_rates',
      sampleData: sampleData,
      insertResult: insertData,
      insertError: insertError ? {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      } : null
    });
    
  } catch (err) {
    return NextResponse.json({ 
      error: 'Error general',
      details: err
    }, { status: 500 });
  }
}
