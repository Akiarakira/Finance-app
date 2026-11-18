import { createClient } from '@/lib/supabase';
import { FolderKanban, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import CreateWalletModal from '@/components/CreateWalletModal';
import EditWalletModal from '@/components/EditWalletModal';
import DeleteWalletModal from '@/components/DeleteWalletModal';

export default async function WalletsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type WalletRecord = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at?: string;
    balance?: number;
  };

  let wallets: WalletRecord[] = [];

  if (user) {
    try {
      const [{ data: initialOwnedWallets, error: ownedError }, { data: permissions, error: permissionsError }] = await Promise.all([
        supabase
          .from('wallets')
          .select('id, name, description, created_at, updated_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wallet_permissions')
          .select('wallet_id')
          .eq('user_id', user.id),
      ]);

      let ownedWallets: WalletRecord[] = initialOwnedWallets ?? [];
      if (ownedError) {
        console.error('Wallets page owned wallets error:', ownedError.message);
        const fallback = await supabase
          .from('wallets')
          .select('id, name, description, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });
        if (!fallback.error) ownedWallets = fallback.data ?? [];
      }

      const sharedWalletIds = (permissions ?? []).map((permission) => permission.wallet_id);
      let sharedWallets: WalletRecord[] = [];

      if (sharedWalletIds.length > 0) {
        const { data, error } = await supabase
          .from('wallets')
          .select('id, name, description, created_at, updated_at')
          .in('id', sharedWalletIds)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Wallets page shared wallets error:', error.message);
          const fallback = await supabase
            .from('wallets')
            .select('id, name, description, created_at')
            .in('id', sharedWalletIds)
            .order('created_at', { ascending: false });
          if (!fallback.error) sharedWallets = fallback.data ?? [];
        } else {
          sharedWallets = data ?? [];
        }
      }

      const uniqueWallets = new Map<string, WalletRecord>();
      for (const wallet of [...(ownedWallets ?? []), ...sharedWallets]) {
        uniqueWallets.set(wallet.id, wallet);
      }
      wallets = [...uniqueWallets.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

      const walletIds = wallets.map((wallet) => wallet.id);
      if (walletIds.length > 0) {
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('wallet_id, type, amount')
          .in('wallet_id', walletIds);

        if (transactionsError) {
          console.error('Wallets page balances error:', transactionsError.message);
        } else {
          const balances = new Map<string, number>();
          for (const transaction of transactions ?? []) {
            const amount = Number(transaction.amount) || 0;
            const currentBalance = balances.get(transaction.wallet_id) ?? 0;
            balances.set(
              transaction.wallet_id,
              transaction.type === 'income' ? currentBalance + amount : currentBalance - amount,
            );
          }
          wallets = wallets.map((wallet) => ({
            ...wallet,
            balance: balances.get(wallet.id) ?? 0,
          }));
        }
      }

      if (permissionsError) {
        console.error('Wallets page permissions error:', permissionsError.message);
      }
    } catch (error) {
      console.error('Unexpected wallets page error:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Wallets</h1>
          <p className="text-slate-500">Gestiona todas tus wallets de dinero.</p>
        </div>
        <CreateWalletModal />
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <FolderKanban size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {user ? 'Aún no tienes wallets' : 'Inicia sesión para ver tus wallets'}
            </h3>
            <p className="text-slate-500 mb-6">
              {user ? 'Crea tu primera wallet para empezar a organizar tus finanzas.' : 'Inicia sesión para gestionar tus wallets.'}
            </p>
            {user && <CreateWalletModal />}
          </div>
        )}

        {wallets.map((wallet) => (
          <div key={wallet.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <FolderKanban size={24} />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical size={20} />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{wallet.name}</h3>
            
            {wallet.description && (
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{wallet.description}</p>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Balance</span>
                <span className="text-lg font-bold text-slate-800">${(wallet.balance ?? 0).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Creada</span>
                <span className="text-sm text-slate-600">
                  {new Date(wallet.created_at).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Actualizada</span>
                <span className="text-sm text-slate-600">
                  {new Date(wallet.updated_at ?? wallet.created_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
            
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <Link
                  href={`/dashboard/income?walletId=${wallet.id}`}
                  className="rounded-lg bg-green-50 px-2 py-2 text-center text-xs font-semibold text-green-700 transition hover:bg-green-100"
                >
                  + Ingreso
                </Link>
                <Link
                  href={`/dashboard/expenses?walletId=${wallet.id}`}
                  className="rounded-lg bg-red-50 px-2 py-2 text-center text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  + Gasto
                </Link>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/wallets/${wallet.id}`}
                  className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                >
                  Ver detalles
                </Link>
                <div className="flex gap-2">
                  <EditWalletModal wallet={wallet} />
                  <DeleteWalletModal wallet={wallet} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
