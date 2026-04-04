'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Wallet as WalletIcon, X } from 'lucide-react';
import { createWallet } from '@/lib/actions/wallets';

export default function CreateWalletModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const resetState = () => {
    setName('');
    setDescription('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWallet(name.trim(), description.trim());
      if (!result.success) {
        setError(result.error ?? 'No se pudo crear la caja.');
        return;
      }
      setSuccessMessage('Caja creada exitosamente.');
      router.refresh();
      setTimeout(() => {
        setIsOpen(false);
        resetState();
      }, 400);
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 transition"
      >
        <Plus size={18} />
        Crear nueva Caja
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              onClick={() => {
                setIsOpen(false);
                resetState();
              }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <WalletIcon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Nueva Caja</h3>
                <p className="text-sm text-slate-500">Organiza tus finanzas creando una nueva caja.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-600">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Caja Principal"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional. Describe el propósito de la caja"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 text-red-600 px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg bg-green-50 text-green-700 px-3 py-2 text-sm">
                  {successMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    setIsOpen(false);
                    resetState();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Crear Caja
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
