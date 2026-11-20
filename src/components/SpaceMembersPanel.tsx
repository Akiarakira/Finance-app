'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, User, Trash2 } from 'lucide-react';
import {
  addSpaceMember,
  listSpaceMembers,
  removeSpaceMember,
  searchUsersForSpaceAccess,
  updateSpaceMemberRole,
  type SpaceMemberEntry,
  type SpaceRole,
  type SpaceUserResult,
} from '@/lib/actions/financial-spaces';

type GrantableRole = Exclude<SpaceRole, 'owner'>;

const memberRoleLabels: Record<SpaceRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Lectura',
};

export default function SpaceMembersPanel({ spaceId, canManage }: { spaceId: string; canManage: boolean }) {
  const [members, setMembers] = useState<SpaceMemberEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpaceUserResult[]>([]);
  const [grantRole, setGrantRole] = useState<GrantableRole>('editor');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    startLoading(async () => {
      const result = await listSpaceMembers(spaceId);
      if (result.success) setMembers(result.members ?? []);
      else setError(result.error ?? 'No se pudieron cargar los miembros.');
      setLoaded(true);
    });
  }, [spaceId]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await searchUsersForSpaceAccess(spaceId, searchQuery);
      if (!result.success) {
        setError(result.error ?? 'No se pudieron buscar usuarios.');
        return;
      }
      setSearchResults(result.users ?? []);
      if ((result.users ?? []).length === 0) setMessage('No se encontraron usuarios disponibles.');
    });
  };

  const handleAdd = (user: SpaceUserResult) => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await addSpaceMember(spaceId, user.id, grantRole);
      if (!result.success) {
        setError(result.error ?? 'No se pudo agregar el miembro.');
        return;
      }
      setMembers((current) => [...current, { userId: user.id, role: grantRole, username: user.username, fullName: user.fullName, email: user.email }]);
      setSearchResults((current) => current.filter((item) => item.id !== user.id));
      setMessage('Miembro agregado.');
      router.refresh();
    });
  };

  const handleUpdateRole = (userId: string, role: GrantableRole) => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateSpaceMemberRole(spaceId, userId, role);
      if (!result.success) {
        setError(result.error ?? 'No se pudo actualizar el rol.');
        return;
      }
      setMembers((current) => current.map((member) => (member.userId === userId ? { ...member, role } : member)));
      setMessage('Rol actualizado.');
    });
  };

  const handleRemove = (userId: string) => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await removeSpaceMember(spaceId, userId);
      if (!result.success) {
        setError(result.error ?? 'No se pudo quitar el miembro.');
        return;
      }
      setMembers((current) => current.filter((member) => member.userId !== userId));
      setMessage('Miembro eliminado del espacio.');
      router.refresh();
    });
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
      {isLoading && !loaded && <p className="text-sm text-slate-400">Cargando miembros...</p>}

      {loaded && members.length > 0 && (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-200">
                  <User size={16} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {member.fullName || member.username || member.email || 'Usuario'}
                  </p>
                  {member.username && member.fullName && <p className="text-xs text-slate-500">@{member.username}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(event) => handleUpdateRole(member.userId, event.target.value as GrantableRole)}
                    disabled={isPending}
                    className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Lectura</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {memberRoleLabels[member.role]}
                  </span>
                )}
                {canManage && member.role !== 'owner' && (
                  <button type="button" onClick={() => handleRemove(member.userId)} disabled={isPending} className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por email, nombre o usuario..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={grantRole} onChange={(event) => setGrantRole(event.target.value as GrantableRole)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="viewer">Lectura</option>
            </select>
            <button type="submit" disabled={isPending || !searchQuery.trim()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              <Search size={16} />
              Buscar
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{user.fullName || user.username || user.email || 'Usuario'}</p>
                    {user.username && user.fullName && <p className="text-xs text-slate-500">@{user.username}</p>}
                  </div>
                  <button type="button" onClick={() => handleAdd(user)} disabled={isPending} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    </div>
  );
}
