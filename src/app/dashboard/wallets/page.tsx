import { createClient } from '@/lib/supabase';
import { FolderKanban, Plus, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import CreateWalletModal from '@/components/CreateWalletModal';
import EditWalletModal from '@/components/EditWalletModal';
import DeleteWalletModal from '@/components/DeleteWalletModal';

export default async function WalletsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  type WalletRecord = { 
    id: string; 
    name: string; 
    description: string | null;
    created_at: string;
    balance?: number;
  };

  let wallets: WalletRecord[] = [];

  if (user) {
    try {
      console.log('Fetching wallets for user:', user.id);
      
      // First get the wallet permissions for this user
      const { data: permissions, error: permError } = await supabase
        .from('wallet_permissions')
        .select('wallet_id')
        .eq('user_id', user.id);

      console.log('Permissions query result:', { permissions, permError });

      if (permError) {
        console.error('Wallets page permissions error:', JSON.stringify(permError, null, 2));
        
        // Fallback: Try to get wallets directly by created_by
        console.log('Trying fallback approach for wallets page...');
        const { data: fallbackWallets, error: fallbackError } = await supabase
          .from('wallets')
          .select('id, name, description, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });
          
        console.log('Fallback query result:', { fallbackWallets, fallbackError });
        
        if (fallbackError) {
          console.error('Fallback query also failed:', JSON.stringify(fallbackError, null, 2));
        } else if (fallbackWallets) {
          wallets = fallbackWallets;
          console.log('Using fallback wallets:', wallets);
        }
      } else if (permissions && permissions.length > 0) {
        // Then get the wallet details for the permitted wallets
        const walletIds = permissions.map(p => p.wallet_id);
        console.log('Wallet IDs from permissions:', walletIds);
        
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, name, description, created_at')
          .in('id', walletIds)
          .order('created_at', { ascending: false });

        console.log('Wallets query result:', { walletData, walletError });

        if (walletError) {
          console.error('Wallets page wallets error:', JSON.stringify(walletError, null, 2));
        } else if (walletData) {
          wallets = walletData;
          console.log('Final wallets array:', wallets);
        }
      } else {
        console.log('No permissions found for user');
      }
    } catch (err) {
      console.error('Unexpected wallets page error:', err);
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
                <span className="text-lg font-bold text-slate-800">$0.00</span>
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
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              <Link
                href={`/dashboard/wallets/${wallet.id}`}
                className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                Ver detalles
              </Link>
              <div className="flex gap-2">
                <EditWalletModal wallet={wallet} />
                <DeleteWalletModal wallet={wallet} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
