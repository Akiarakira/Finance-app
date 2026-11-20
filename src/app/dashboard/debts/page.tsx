import { getOrCreatePersonalSpace, listFinancialSpaces } from '@/lib/actions/financial-spaces';
import { listAccounts } from '@/lib/actions/accounts';
import { listLiabilities } from '@/lib/actions/liabilities';
import { listAccessibleWallets } from '@/lib/actions/transactions';
import DebtsManager from '@/components/DebtsManager';

export default async function DebtsPage() {
  await getOrCreatePersonalSpace();

  const [spacesResult, liabilitiesResult, walletsResult, accountsResult] = await Promise.all([
    listFinancialSpaces(),
    listLiabilities(true),
    listAccessibleWallets(),
    listAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Deudas</h1>
        <p className="text-slate-500">Registra tus pasivos externos y lleva el historial de pagos.</p>
      </div>

      {(spacesResult.error || liabilitiesResult.error || walletsResult.error || accountsResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {spacesResult.error ?? liabilitiesResult.error ?? walletsResult.error ?? accountsResult.error}
        </div>
      )}

      <DebtsManager
        liabilities={liabilitiesResult.liabilities ?? []}
        spaces={spacesResult.spaces ?? []}
        wallets={walletsResult.wallets ?? []}
        accounts={accountsResult.accounts ?? []}
      />
    </div>
  );
}
