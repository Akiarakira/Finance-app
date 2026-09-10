import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, name, description, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (walletError || !wallet) notFound();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, amount, currency, description, transaction_date, payment_method')
    .eq('wallet_id', id)
    .order('transaction_date', { ascending: false })
    .limit(50);

  const { data: history } = await supabase
    .from('wallet_history')
    .select('id, action, old_name, new_name, old_description, new_description, changed_at')
    .eq('wallet_id', id)
    .order('changed_at', { ascending: false })
    .limit(20);

  const balance = (transactions ?? []).reduce((total, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return transaction.type === 'income' ? total + amount : total - amount;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/dashboard/wallets" className="text-sm text-blue-600 hover:underline">← Volver a wallets</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">{wallet.name}</h1>
          {wallet.description && <p className="mt-1 text-slate-500">{wallet.description}</p>}
          <p className="mt-2 text-xs text-slate-400">Actualizada: {new Date(wallet.updated_at).toLocaleString('es-ES')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-xs font-medium text-slate-400">Balance mostrado</p>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{balance.toFixed(2)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-800">Movimientos de la wallet</h2>
        {(transactions ?? []).length === 0 ? (
          <p className="py-10 text-center text-slate-400">Aún no hay movimientos en esta wallet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {(transactions ?? []).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-800">{transaction.description || 'Movimiento sin descripción'}</p>
                  <p className="text-sm text-slate-500">{transaction.transaction_date} · {transaction.payment_method}</p>
                </div>
                <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                  {transaction.type === 'income' ? '+' : '-'} {Number(transaction.amount).toFixed(2)} {transaction.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-800">Historial de cambios</h2>
        {(history ?? []).length === 0 ? (
          <p className="py-8 text-center text-slate-400">No hay cambios registrados todavía.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {(history ?? []).map((entry) => (
              <div key={entry.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-800">
                    {entry.action === 'created' ? 'Wallet creada' : entry.action === 'updated' ? 'Wallet actualizada' : 'Wallet eliminada'}
                  </p>
                  <time className="text-xs text-slate-400">{new Date(entry.changed_at).toLocaleString('es-ES')}</time>
                </div>
                {entry.action === 'updated' && (
                  <p className="mt-1 text-sm text-slate-500">
                    {entry.old_name !== entry.new_name ? `${entry.old_name} → ${entry.new_name}` : 'Se actualizó la descripción o los datos.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
