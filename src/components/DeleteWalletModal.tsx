'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, X, AlertTriangle } from 'lucide-react';
import { deleteWallet } from '@/lib/actions/wallets';

interface DeleteWalletModalProps {
  wallet: {
    id: string;
    name: string;
  };
}

export default function DeleteWalletModal({ wallet }: DeleteWalletModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteWallet(wallet.id);
      if (!result.success) {
        setError(result.error ?? 'No se pudo eliminar la wallet.');
        return;
      }
      setIsOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
      >
        <Trash2 size={14} />
        Eliminar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Eliminar Wallet</h3>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-600">
                ¿Estás seguro de que quieres eliminar la wallet <span className="font-semibold text-slate-800">"{wallet.name}"</span>?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Todos los datos asociados serán eliminados permanentemente.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 text-red-600 px-3 py-2 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow hover:bg-red-500 disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Eliminar Wallet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
