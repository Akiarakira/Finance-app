import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Users,
  FolderKanban,
  ArrowRightLeft,
  FileText,
  CreditCard,
  PieChart,
  Target
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import LogoutButton from './LogoutButton';

const menuItems = [
  { icon: LayoutDashboard, label: 'Resumen', href: '/dashboard' },
  { icon: Wallet, label: 'Mis Cajas', href: '/dashboard/wallets' },
  { icon: Landmark, label: 'Cuentas', href: '/dashboard/accounts' },
  { icon: CreditCard, label: 'Deudas', href: '/dashboard/debts' },
  { icon: PieChart, label: 'Presupuesto', href: '/dashboard/budget' },
  { icon: Target, label: 'Metas', href: '/dashboard/goals' },
  { icon: ArrowUpRight, label: 'Ingresos', href: '/dashboard/income' },
  { icon: ArrowDownLeft, label: 'Gastos', href: '/dashboard/expenses' },
  { icon: Users, label: 'Compartidos', href: '/dashboard/shared' },
  { icon: ArrowRightLeft, label: 'Comparar pagos', href: '/dashboard/compare' },
  { icon: FileText, label: 'Estado de cuenta', href: '/dashboard/reports' },
];

export default async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type WalletRecord = { id: string; name: string; description: string | null };

  let wallets: WalletRecord[] = [];

  if (user) {
    try {
      const [{ data: ownedWallets, error: ownedError }, { data: permissions, error: permissionsError }] = await Promise.all([
        supabase
          .from('wallets')
          .select('id, name, description')
          .eq('created_by', user.id),
        supabase
          .from('wallet_permissions')
          .select('wallet_id')
          .eq('user_id', user.id),
      ]);

      if (ownedError) console.error('Sidebar owned wallets error:', ownedError.message);

      const sharedWalletIds = (permissions ?? []).map((permission) => permission.wallet_id);
      let sharedWallets: WalletRecord[] = [];
      if (sharedWalletIds.length > 0) {
        const { data, error } = await supabase
          .from('wallets')
          .select('id, name, description')
          .in('id', sharedWalletIds);
        if (error) console.error('Sidebar shared wallets error:', error.message);
        else sharedWallets = data ?? [];
      }

      const uniqueWallets = new Map<string, WalletRecord>();
      for (const wallet of [...(ownedWallets ?? []), ...sharedWallets]) {
        uniqueWallets.set(wallet.id, wallet);
      }
      wallets = [...uniqueWallets.values()];

      if (permissionsError) console.error('Sidebar permissions error:', permissionsError.message);
    } catch (error) {
      console.error('Unexpected sidebar error:', error);
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