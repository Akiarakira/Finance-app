import TransactionForm from '@/components/TransactionForm';
import { listAccessibleWallets, listCategories, listTransactions, type TransactionType } from '@/lib/actions/transactions';

const paymentLabels: Record<string, string> = {
  binance: 'Binance / Pay',
  bs: 'Bolívares',
  cash_usd: 'Efectivo USD',
  other: 'Otro',
};

export default async function TransactionPage({ type }: { type: TransactionType }) {
  const [walletsResult, categoriesResult, transactionsResult] = await Promise.all([
    listAccessibleWallets(),
    listCategories(),
    listTransactions(type),
  ]);
  const isIncome = type === 'income';
  const transactions = transactionsResult.transactions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{isIncome ? 'Ingresos' : 'Gastos'}</h1>
        <p className="text-slate-500">Registra y consulta tus movimientos por wallet.</p>
      </div>

      {(walletsResult.error || categoriesResult.error || transactionsResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {walletsResult.error ?? categoriesResult.error ?? transactionsResult.error}
        </div>
      )}

      <TransactionForm
        type={type}
        wallets={walletsResult.wallets ?? []}
        categories={categoriesResult.categories ?? []}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">Movimientos recientes</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Aún no hay movimientos registrados.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-800">{transaction.description || 'Movimiento sin descripción'}</p>
                  <p className="text-sm text-slate-500">
                    {transaction.category_name ?? 'Sin categoría'} · {paymentLabels[transaction.payment_method] ?? transaction.payment_method} · {transaction.transaction_date}
                  </p>
                </div>
                <span className={`font-semibold ${isIncome ? 'text-green-600' : 'text-slate-800'}`}>
                  {isIncome ? '+' : '-'} {transaction.amount.toFixed(2)} {transaction.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
