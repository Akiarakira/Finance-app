'use server';

import { createClient } from '@/lib/supabase';
import type { Currency } from '@/lib/actions/transactions';

export interface InternalTransfer {
  id: string;
  space_id: string;
  source_account_id: string;
  source_account_name: string | null;
  destination_account_id: string;
  destination_account_name: string | null;
  source_amount: number;
  source_currency: Currency;
  destination_amount: number;
  destination_currency: Currency;
  exchange_rate: number | null;
  transfer_date: string;
  notes: string | null;
  created_at: string;
}

export interface TransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmount: number;
  sourceCurrency: Currency;
  destinationAmount: number;
  destinationCurrency: Currency;
  transferDate?: string;
  notes?: string;
}

const TRANSFER_COLUMNS =
  'id, space_id, source_amount, source_currency, destination_amount, destination_currency, exchange_rate, transfer_date, notes, created_at, source_account_id, destination_account_id, source:accounts!internal_transfers_source_account_id_fkey(name), destination:accounts!internal_transfers_destination_account_id_fkey(name)';

function mapTransfer(row: Record<string, unknown>): InternalTransfer {
  const source = Array.isArray(row.source) ? row.source[0] : row.source;
  const destination = Array.isArray(row.destination) ? row.destination[0] : row.destination;
  return {
    ...row,
    source_account_name: (source as { name?: string } | null | undefined)?.name ?? null,
    destination_account_name: (destination as { name?: string } | null | undefined)?.name ?? null,
    source_amount: Number(row.source_amount) || 0,
    destination_amount: Number(row.destination_amount) || 0,
    exchange_rate: row.exchange_rate === null || row.exchange_rate === undefined ? null : Number(row.exchange_rate),
  } as InternalTransfer;
}

export async function listInternalTransfers(limit = 20): Promise<{ success: boolean; transfers?: InternalTransfer[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('internal_transfers')
      .select(TRANSFER_COLUMNS)
      .order('transfer_date', { ascending: false })
      .limit(limit);

    if (error) return { success: false, error: error.message };
    return { success: true, transfers: (data ?? []).map((row) => mapTransfer(row)) };
  } catch (error) {
    console.error('listInternalTransfers error:', error);
    return { success: false, error: 'No se pudieron cargar las transferencias.' };
  }
}

export async function createInternalTransfer(input: TransferInput): Promise<{ success: boolean; error?: string }> {
  if (!input.sourceAccountId || !input.destinationAccountId) return { success: false, error: 'Selecciona cuenta de origen y destino.' };
  if (input.sourceAccountId === input.destinationAccountId) return { success: false, error: 'La cuenta de origen y destino no pueden ser la misma.' };
  if (!input.sourceAmount || input.sourceAmount <= 0) return { success: false, error: 'El monto de origen debe ser mayor a cero.' };
  if (!input.destinationAmount || input.destinationAmount <= 0) return { success: false, error: 'El monto recibido debe ser mayor a cero.' };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión.' };

    const { data: source, error: sourceError } = await supabase
      .from('accounts')
      .select('id, space_id')
      .eq('id', input.sourceAccountId)
      .maybeSingle();

    if (sourceError) return { success: false, error: sourceError.message };
    if (!source) return { success: false, error: 'La cuenta de origen no existe o no tienes acceso.' };

    // Tasa resultante: cuántas unidades de destino por cada unidad de origen.
    const exchangeRate = input.destinationAmount / input.sourceAmount;

    const { error } = await supabase
      .from('internal_transfers')
      .insert({
        user_id: authData.user.id,
        space_id: source.space_id,
        source_account_id: input.sourceAccountId,
        destination_account_id: input.destinationAccountId,
        source_amount: input.sourceAmount,
        source_currency: input.sourceCurrency,
        destination_amount: input.destinationAmount,
        destination_currency: input.destinationCurrency,
        exchange_rate: exchangeRate,
        transfer_date: input.transferDate ?? new Date().toISOString().slice(0, 10),
        notes: input.notes?.trim() || null,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('createInternalTransfer error:', error);
    return { success: false, error: 'Ocurrió un error registrando la transferencia.' };
  }
}

export async function deleteInternalTransfer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('internal_transfers').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteInternalTransfer error:', error);
    return { success: false, error: 'Ocurrió un error eliminando la transferencia.' };
  }
}
