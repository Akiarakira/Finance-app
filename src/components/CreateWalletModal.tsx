'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Wallet as WalletIcon, X } from 'lucide-react';
import { createWallet, listWalletAccess } from '@/lib/actions/wallets';
import WalletAccessManager from './WalletAccessManager';

interface WalletAccessItem {
  userId: string;
  role: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export default function CreateWalletModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createdWalletId, setCreatedWalletId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessList, setAccessList] = useState<WalletAccessItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();
  const router = useRouter();

  const resetState = () => {
    setIsAccessOpen(false);
    setName('');
    setDescription('');
    setCreatedWalletId(null);
    setError(null);
    setSuccessMessage(null);
    setAccessList([]);
  };

  const loadWalletAccess = (walletId: string) => {
    startAccessTransition(async () => {
      const result = await listWalletAccess(walletId);
      if (!result.success) {
        console.error('Failed to load wallet access:', result.error);
        return;
      }
      setAccessList(result.access ?? []);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      console.log('Creating wallet...');
      const result = await createWallet(name.trim(), description.trim());
      console.log('Create result:', result);
      if (!result.success) {
        console.error('Wallet creation failed:', result.error);
        setError(result.error ?? 'No se pudo crear la wallet.');
        return;
      }
      const newWalletId = result.wallet?.id ?? null;
      console.log('Setting createdWalletId:', newWalletId);
      setCreatedWalletId(newWalletId);
      setSuccessMessage('Wallet creada exitosamente. Ahora puedes compartir accesos.');
      setIsAccessOpen(true);
      if (newWalletId) {
        loadWalletAccess(newWalletId);
      }
      router.refresh();
    });
  };



  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 transition"
      >
        <Plus size={18} />
        Crear nueva Wallet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
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
                <h3 className="text-xl font-semibold text-slate-800">Nueva Wallet</h3>
                <p className="text-sm text-slate-500">Organiza tus finanzas creando una nueva wallet.</p>
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
                    placeholder="Ej. Wallet Principal"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional. Describe el propósito de la wallet"
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
                        Crear Wallet
                      </>
                    )}
                  </button>
                </div>
              </form>

              {createdWalletId && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccessOpen(!isAccessOpen);
                      if (!isAccessOpen && createdWalletId) {
                        loadWalletAccess(createdWalletId);
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <span className="text-sm font-medium text-slate-700">Gestionar Accesos</span>
                    <Plus size={18} className={`text-slate-500 transition-transform ${isAccessOpen ? 'rotate-45' : ''}`} />
                  </button>

                  {isAccessOpen && createdWalletId && (
                    <div className="mt-4">
                      <WalletAccessManager 
                        walletId={createdWalletId} 
                        initialAccess={accessList.map(item => ({
                          id: item.userId,
                          username: item.username,
                          fullName: item.fullName,
                          avatarUrl: item.avatarUrl,
                          role: item.role as 'owner' | 'editor' | 'viewer'
                        }))}
                        onAccessChange={() => loadWalletAccess(createdWalletId)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      )}
    </>
  );
}
