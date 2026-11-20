import TransactionForm from '@/components/TransactionForm';
import TransactionsList from '@/components/TransactionsList';
import IncomeSourcesManager from '@/components/IncomeSourcesManager';
import { listAccessibleWallets, listCategories, listTransactions, type TransactionType } from '@/lib/actions/transactions';
import { listIncomeSources } from '@/lib/actions/income-sources';
import { getIncomePeriodSummary, type SourcePeriodStat } from '@/lib/actions/income-summary';
import { listAccounts } from '@/lib/actions/accounts';
import { listCustodyFunds } from '@/lib/actions/custody-funds';

export default async function TransactionPage({ type, initialWalletId }: { type: TransactionType; initialWalletId?: string }) {
  const isIncome = type === 'income';
  const [walletsResult, categoriesResult, transactionsResult, incomeSourcesResult, accountsResult, incomeSummaryResult, custodyFundsResult] = await Promise.all([
    listAccessibleWallets(),
    listCategories(),
    listTransactions(type),
    isIncome ? listIncomeSources(true) : Promise.resolve({ success: true as const, sources: [] }),
    listAccounts(),
    isIncome ? getIncomePeriodSummary() : Promise.resolve({ success: true as const, summary: undefined }),
    listCustodyFunds(),
  ]);
  const transactions = transactionsResult.transactions ?? [];
  const incomeSources = incomeSourcesResult.sources ?? [];
  const accounts = accountsResult.accounts ?? [];
  const custodyFunds = custodyFundsResult.funds ?? [];
  const statsBySource = Object.fromEntries(
    (incomeSummaryResult.summary?.bySource ?? []).map((stat) => [stat.sourceId, stat]),
  ) as Record<string, SourcePeriodStat>;

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

      {isIncome && <IncomeSourcesManager sources={incomeSources} accounts={accounts} stats={statsBySource} />}

      <TransactionForm
        type={type}
        wallets={walletsResult.wallets ?? []}
        categories={categoriesResult.categories ?? []}
        incomeSources={incomeSources.filter((source) => source.is_active)}
        accounts={accounts}
        custodyFunds={custodyFunds}
        initialWalletId={initialWalletId}
      />

      <TransactionsList transactions={transactions} isIncome={isIncome} />
    </div>
  );
}
