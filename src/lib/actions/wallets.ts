'use server';

import { createClient } from '@/lib/supabase';

interface CreateWalletResult {
  success: boolean;
  error?: string;
  wallet?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export async function createWallet(name: string, description: string): Promise<CreateWalletResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'No se pudo obtener la sesión del usuario.' };
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' });

    if (profileError) {
      console.error('createWallet profile upsert error:', profileError);
      return { success: false, error: 'No se pudo sincronizar el perfil del usuario.' };
    }

    const {
      data: wallet,
      error: walletError,
    } = await supabase
      .from('wallets')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (walletError || !wallet) {
      return { success: false, error: walletError?.message || 'No se pudo crear la wallet.' };
    }

    const { error: permissionError } = await supabase
      .from('wallet_permissions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        role: 'owner',
      });

    if (permissionError) {
      return { success: false, error: permissionError.message };
    }

    return {
      success: true,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        description: wallet.description ?? null,
      },
    };
  } catch (error) {
    console.error('createWallet error:', error);
    return { success: false, error: 'Ocurrió un error creando la caja.' };
  }
}
