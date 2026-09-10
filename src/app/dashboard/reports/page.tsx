import Link from 'next/link';
import { getMonthlySummary } from '@/lib/actions/transactions';

const paymentLabels: Record<string, string> = {
  binance: 'Binance / Binance Pay',
  bs: 'Bolívares',
  cash_usd: 'Efectivo USD',
  other: 'Otro',
};

export default async function ReportsPage() {
  const month = new Date().toISOString().slice(0, 7);
  const result = await getMonthlySummary(month);
  const summary = result.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estado de cuenta</h1>
          <p className="text-slate-500">Resumen de administración financiera de {month}.</p>
        </div>
        <Link href="/dashboard/compare" className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500">Comparar una compra</Link>
      </div>

      {result.error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{result.error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Ingresos" value={summary?.income ?? 0} color="text-green-600" />
        <SummaryCard label="Gastos" value={summary?.expenses ?? 0} color="text-red-600" />
        <SummaryCard label="Balance" value={summary?.balance ?? 0} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SummaryList title="Gastos por categoría" items={summary?.byCategory ?? []} empty="No hay gastos categorizados este mes." />
        <SummaryList title="Gastos por método de pago" items={(summary?.byPaymentMethod ?? []).map((item) => ({ ...item, name: paymentLabels[item.name] ?? item.name }))} empty="No hay gastos registrados este mes." />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value.toFixed(2)} USD</p>
    </div>
  );
}

function SummaryList({ title, items, empty }: { title: string; items: Array<{ name: string; amount: number }>; empty: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">{title}</h2>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-600">{item.name}</span>
              <span className="font-semibold text-slate-800">{item.amount.toFixed(2)} USD</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
