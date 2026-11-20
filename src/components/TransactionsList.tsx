'use client';

import { useState } from 'react';
import type { TransactionRecord } from '@/lib/actions/transactions';

const paymentLabels: Record<string, string> = {
  binance: 'Binance / Pay',
  bs: 'Bolívares',
  cash_usd: 'Efectivo USD',
  other: 'Otro',
};

export default function TransactionsList({ transactions, isIncome }: { transactions: TransactionRecord[]; isIncome: boolean }) {
  const [spaceFilter, setSpaceFilter] = useState('');

  const spaces = new Map<string, string>();
  for (const tx of transactions) {
    if (tx.space_id && tx.space_name) spaces.set(tx.space_id, tx.space_name);
  }

  const visible = spaceFilter
    ? transactions.filter((tx) => tx.space_id === spaceFilter)
    : transactions;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-bold text-slate-800">Movimientos recientes</h2>
        {spaces.size > 0 && (
          <select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
            <option value="">Todos los espacios</option>
            {[...spaces.entries()].map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-slate-400">{transactions.length === 0 ? 'Aún no hay movimientos registrados.' : 'Sin movimientos en este espacio.'}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {visible.map((transaction) => (
            <div key={transaction.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-800">{transaction.description || 'Movimiento sin descripción'}</p>
                <p className="text-sm text-slate-500">
                  {transaction.category_name ?? 'Sin categoría'} · {paymentLabels[transaction.payment_method] ?? transaction.payment_method} · {transaction.transaction_date}
                  {transaction.income_source_name && ` · Fuente: ${transaction.income_source_name}`}
                  {transaction.account_name && ` · Cuenta: ${transaction.account_name}`}
                  {transaction.custody_fund_name && ` · Custodia: ${transaction.custody_fund_name}`}
                  {transaction.budget_category_name && ` · Presupuesto: ${transaction.budget_category_name}`}
                </p>
                <p className="text-xs text-slate-400">
                  Registrado por: {transaction.created_by_name ?? transaction.created_by_email ?? transaction.created_by}
                  {transaction.space_name && ` · Espacio: ${transaction.space_name}`}
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
  );
}
