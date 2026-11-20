import { getOrCreatePersonalSpace, listFinancialSpaces } from '@/lib/actions/financial-spaces';
import { getBudgetSummary } from '@/lib/actions/budget';
import BudgetManager from '@/components/BudgetManager';

export default async function BudgetPage() {
  await getOrCreatePersonalSpace();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [spacesResult, summaryResult] = await Promise.all([
    listFinancialSpaces(),
    getBudgetSummary(currentMonth),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Presupuesto 50-30-20</h1>
        <p className="text-slate-500">
          Base del mes: <strong>${summaryResult.summary?.budgetBase.toFixed(2) ?? '0.00'}</strong> según tu regla de ingresos. Distribúyela en categorías por pilar.
        </p>
      </div>

      {(spacesResult.error || summaryResult.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {spacesResult.error ?? summaryResult.error}
        </div>
      )}

      {summaryResult.summary && (
        <BudgetManager summary={summaryResult.summary} spaces={spacesResult.spaces ?? []} month={currentMonth} />
      )}
    </div>
  );
}
