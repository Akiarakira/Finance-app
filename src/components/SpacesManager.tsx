'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createFinancialSpace,
  deleteFinancialSpace,
  setFinancialSpaceActive,
  updateFinancialSpace,
  type FinancialSpace,
  type FinancialSpaceType,
  type SpaceRole,
} from '@/lib/actions/financial-spaces';

const typeLabels: Record<FinancialSpaceType, string> = {
  personal: 'Personal',
  household: 'Hogar',
  custody: 'Custodia',
  shared: 'Compartido',
};

const roleLabels: Record<SpaceRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Lectura',
};

const typeBadgeStyles: Record<FinancialSpaceType, string> = {
  personal: 'bg-blue-100 text-blue-700',
  household: 'bg-green-100 text-green-700',
  custody: 'bg-purple-100 text-purple-700',
  shared: 'bg-amber-100 text-amber-700',
};

export default function SpacesManager({ spaces }: { spaces: FinancialSpace[] }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialSpaceType>('household');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<FinancialSpaceType>('personal');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createFinancialSpace({ name, type });
      if (!result.success) {
        setError(result.error ?? 'No se pudo crear el espacio.');
        return;
      }
      setName('');
      router.refresh();
    });
  };

  const startEdit = (space: FinancialSpace) => {
    setError(null);
    setEditingId(space.id);
    setEditName(space.name);
    setEditType(space.type);
  };

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    setError(null);

    startTransition(async () => {
      const result = await updateFinancialSpace(editingId, { name: editName, type: editType });
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar el espacio.');
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  };

  const handleToggle = (space: FinancialSpace) => {
    startTransition(async () => {
      const result = await setFinancialSpaceActive(space.id, !space.is_active);
      if (!result.success) setError(result.error ?? 'No se pudo actualizar el espacio.');
      router.refresh();
    });
  };

  const handleDelete = (space: FinancialSpace) => {
    if (!window.confirm(`¿Eliminar el espacio "${space.name}"? Solo es posible si no tiene cuentas.`)) return;
    startTransition(async () => {
      const result = await deleteFinancialSpace(space.id);
      if (!result.success) setError(result.error ?? 'No se pudo eliminar el espacio.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-800">Espacios financieros</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Nombre
          <input required type="text" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800" placeholder="Ej. Hogar, Custodia Mami" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Tipo
          <select value={type} onChange={(event) => setType(event.target.value as FinancialSpaceType)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-normal text-slate-800">
            <option value="household">Hogar</option>
            <option value="custody">Custodia</option>
            <option value="shared">Compartido</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? 'Guardando...' : 'Crear espacio'}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {spaces.length === 0 ? (
        <p className="py-6 text-center text-slate-400">Aún no tienes espacios. Tu espacio personal se crea automáticamente.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {spaces.map((space) => (
            <div key={space.id} className={`py-3 ${!space.is_active ? 'opacity-50' : ''}`}>
              {editingId === space.id ? (
                <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-700">
                    Nombre
                    <input required type="text" value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal text-slate-800" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Tipo
                    <select value={editType} onChange={(event) => setEditType(event.target.value as FinancialSpaceType)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 font-normal text-slate-800">
                      <option value="personal">Personal</option>
                      <option value="household">Hogar</option>
                      <option value="custody">Custodia</option>
                      <option value="shared">Compartido</option>
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                      {isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} disabled={isPending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-60">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-medium text-slate-800">
                      {space.name}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeStyles[space.type]}`}>
                        {typeLabels[space.type]}
                      </span>
                      {space.my_role && space.my_role !== 'owner' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                          {roleLabels[space.my_role]}
                        </span>
                      )}
                      {!space.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Inactivo</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(space)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleToggle(space)} disabled={isPending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      {space.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" onClick={() => handleDelete(space)} disabled={isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
