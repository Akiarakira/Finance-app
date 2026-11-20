import { getFinancialSettings } from '@/lib/actions/financial-settings';
import FinancialSettingsForm from '@/components/FinancialSettingsForm';

export default async function SettingsPage() {
  const settingsResult = await getFinancialSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500">Preferencias financieras de tu cuenta.</p>
      </div>

      {settingsResult.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{settingsResult.error}</div>
      )}

      {settingsResult.settings && <FinancialSettingsForm settings={settingsResult.settings} />}
    </div>
  );
}
