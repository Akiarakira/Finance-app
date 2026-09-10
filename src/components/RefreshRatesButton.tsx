'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RefreshRatesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/update-rates', { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'No se pudieron actualizar las tasas.');

      setMessage('Tasas actualizadas');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron actualizar las tasas.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Actualizar tasas"
        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
        {isRefreshing ? 'Actualizando...' : 'Actualizar tasas'}
      </button>
      {message && <span className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white">{message}</span>}
    </div>
  );
}
