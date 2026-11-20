import { getOrCreatePersonalSpace, listFinancialSpaces } from '@/lib/actions/financial-spaces';
import { listAccounts } from '@/lib/actions/accounts';
import { listSavingsGoals } from '@/lib/actions/savings-goals';
import { listAccessibleWallets } from '@/lib/actions/transactions';
import GoalsManager from '@/components/GoalsManager';

export default async function GoalsPage() {
  await getOrCreatePersonalSpace();

  const [spacesResult, goalsResult, walletsResult, accountsResult] = await Promise.all([
    listFinancialSpaces(),
    listSavingsGoals(),
    listAccessibleWallets(),
    listAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Metas de ahorro</h1>
        <p className="text-slate-500">Define objetivos y registra aportes periódicos desde tus wallets.</p>
      </div>

      {(spacesResult.error || goalsResult.error || walletsResult.error || accountsResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {spacesResult.error ?? goalsResult.error ?? walletsResult.error ?? accountsResult.error}
        </div>
      )}

      <GoalsManager
        goals={goalsResult.goals ?? []}
        spaces={spacesResult.spaces ?? []}
        wallets={walletsResult.wallets ?? []}
        accounts={accountsResult.accounts ?? []}
      />
    </div>
  );
}
