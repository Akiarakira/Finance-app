import Link from 'next/link';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  Users,
  FolderKanban,
  ArrowRightLeft,
  FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import LogoutButton from './LogoutButton';

const menuItems = [
  { icon: LayoutDashboard, label: 'Resumen', href: '/dashboard' },
  { icon: Wallet, label: 'Mis Cajas', href: '/dashboard/wallets' },
  { icon: ArrowUpRight, label: 'Ingresos', href: '/dashboard/income' },
  { icon: ArrowDownLeft, label: 'Gastos', href: '/dashboard/expenses' },
  { icon: Users, label: 'Compartidos', href: '/dashboard/shared' },
  { icon: ArrowRightLeft, label: 'Comparar pagos', href: '/dashboard/compare' },
  { icon: FileText, label: 'Estado de cuenta', href: '/dashboard/reports' },
];

export default async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  type WalletRecord = { id: string; name: string; description: string | null };

  let wallets: WalletRecord[] = [];

  if (user) {
    try {
      // First get the wallet permissions for this user
      const { data: permissions, error: permError } = await supabase
        .from('wallet_permissions')
        .select('wallet_id')
        .eq('user_id', user.id);

      if (permError) {
        console.error('Sidebar permissions error:', JSON.stringify(permError, null, 2));
        console.error('Permission error details:', {
          message: permError.message,
          details: permError.details,
          hint: permError.hint,
          code: permError.code
        });
        
        // Fallback: Try to get wallets directly by created_by
        console.log('Trying fallback approach...');
        const { data: fallbackWallets, error: fallbackError } = await supabase
          .from('wallets')
          .select('id, name, description')
          .eq('created_by', user.id);
          
        if (fallbackError) {
          console.error('Fallback query also failed:', JSON.stringify(fallbackError, null, 2));
        } else if (fallbackWallets) {
          wallets = fallbackWallets;
        }
      } else if (permissions && permissions.length > 0) {
        // Then get the wallet details for the permitted wallets
        const walletIds = permissions.map(p => p.wallet_id);
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, name, description')
          .in('id', walletIds);

        if (walletError) {
          console.error('Sidebar wallets error:', JSON.stringify(walletError, null, 2));
          console.error('Wallet error details:', {
            message: walletError.message,
            details: walletError.details,
            hint: walletError.hint,
            code: walletError.code
          });
        } else if (walletData) {
          wallets = walletData;
        }
      }
    } catch (err) {
      console.error('Unexpected sidebar error:', err);
    }
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
          <span>💸</span> FinanzasApp
        </h2>
      </div>

      <nav className="px-4 space-y-2">
        {menuItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group"
          >
            <item.icon size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex-1 px-4 mt-6 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Mis wallets</p>
        <div className="space-y-2">
          {wallets.length === 0 && (
            <p className="text-sm text-slate-400">
              {user ? 'Aún no tienes wallets creadas.' : 'Inicia sesión para ver tus wallets.'}
            </p>
          )}

          {wallets.map((wallet) => (
            <Link
              key={wallet.id}
              href={`/dashboard/wallets/${wallet.id}`}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <FolderKanban size={18} className="text-blue-500" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">{wallet.name}</span>
                {wallet.description && (
                  <span className="line-clamp-1 text-xs text-slate-500">{wallet.description}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2">
        <Link href="/dashboard/settings" className="flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
          <Settings size={20} />
          <span>Configuración</span>
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}