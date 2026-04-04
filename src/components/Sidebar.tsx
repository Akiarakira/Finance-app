import Link from 'next/link';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  LogOut,
  Users,
  FolderKanban
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Resumen', href: '/dashboard' },
  { icon: Wallet, label: 'Mis Cajas', href: '/dashboard/wallets' },
  { icon: ArrowUpRight, label: 'Ingresos', href: '/dashboard/income' },
  { icon: ArrowDownLeft, label: 'Gastos', href: '/dashboard/expenses' },
  { icon: Users, label: 'Compartidos', href: '/dashboard/shared' },
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
    const { data, error } = await supabase
      .from('wallet_permissions')
      .select('wallets:wallet_id (id,name,description)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      wallets = data
        .flatMap((row) => {
          const related = row.wallets as WalletRecord | WalletRecord[] | null;
          if (!related) return [];
          return Array.isArray(related) ? related : [related];
        })
        .filter((wallet): wallet is WalletRecord => Boolean(wallet));
    } else if (error) {
      console.error('Sidebar wallets error:', error);
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
        <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Mis cajas</p>
        <div className="space-y-2">
          {wallets.length === 0 && (
            <p className="text-sm text-slate-400">
              {user ? 'Aún no tienes cajas creadas.' : 'Inicia sesión para ver tus cajas.'}
            </p>
          )}

          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-left hover:border-blue-200 hover:bg-blue-50/40 transition"
            >
              <FolderKanban size={18} className="text-blue-500" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">{wallet.name}</span>
                {wallet.description && (
                  <span className="text-xs text-slate-500 line-clamp-1">{wallet.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2">
        <Link href="/dashboard/settings" className="flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
          <Settings size={20} />
          <span>Configuración</span>
        </Link>
        <button className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-all">
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}