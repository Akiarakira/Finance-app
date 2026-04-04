import { createClient } from '@/lib/supabase'

export async function createInitialWallet(userId: string, walletName: string) {
  const supabase = await createClient();

  // 1. Crear la wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .insert([{ name: walletName, created_by: userId }])
    .select()
    .single();

  if (walletError) throw walletError;

  // 2. Asignar el permiso de 'owner' al creador
  const { error: permError } = await supabase
    .from('wallet_permissions')
    .insert([{ 
      wallet_id: wallet.id, 
      user_id: userId, 
      role: 'owner' 
    }]);

  if (permError) throw permError;

  return wallet;
}