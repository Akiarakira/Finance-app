'use server';

import { createClient } from '@/lib/supabase';

export type FinancialSpaceType = 'personal' | 'household' | 'custody' | 'shared';
export type SpaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface FinancialSpace {
  id: string;
  owner_id: string;
  name: string;
  type: FinancialSpaceType;
  is_active: boolean;
  my_role: SpaceRole | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialSpaceInput {
  name: string;
  type: FinancialSpaceType;
}

const SPACE_COLUMNS = 'id, owner_id, name, type, is_active, created_at, updated_at';

function validateInput(input: FinancialSpaceInput): string | null {
  if (!input.name.trim()) return 'El nombre del espacio es obligatorio.';
  return null;
}

export async function listFinancialSpaces(): Promise<{ success: boolean; spaces?: FinancialSpace[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para ver tus espacios.' };

    const { data, error } = await supabase
      .from('financial_spaces')
      .select(SPACE_COLUMNS)
      .order('is_active', { ascending: false })
      .order('name');

    if (error) return { success: false, error: error.message };

    const spaces = (data ?? []) as Omit<FinancialSpace, 'my_role'>[];
    const spaceIds = spaces.map((space) => space.id);

    const { data: memberships } = spaceIds.length > 0
      ? await supabase
          .from('financial_space_members')
          .select('space_id, role')
          .eq('user_id', authData.user.id)
          .in('space_id', spaceIds)
      : { data: [] };
    const roleBySpace = new Map((memberships ?? []).map((member) => [member.space_id, member.role as SpaceRole]));

    return {
      success: true,
      spaces: spaces.map((space) => ({
        ...space,
        my_role: roleBySpace.get(space.id) ?? (space.owner_id === authData.user.id ? 'owner' : null),
      })),
    };
  } catch (error) {
    console.error('listFinancialSpaces error:', error);
    return { success: false, error: 'No se pudieron cargar los espacios.' };
  }
}

export async function getOrCreatePersonalSpace(): Promise<{ success: boolean; space?: FinancialSpace; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const { data: existing } = await supabase
      .from('financial_spaces')
      .select(SPACE_COLUMNS)
      .eq('owner_id', authData.user.id)
      .eq('type', 'personal')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (existing) return { success: true, space: { ...existing, my_role: 'owner' } as FinancialSpace };

    const { data: space, error: spaceError } = await supabase
      .from('financial_spaces')
      .insert({ owner_id: authData.user.id, name: 'Personal', type: 'personal' })
      .select(SPACE_COLUMNS)
      .single();

    if (spaceError || !space) return { success: false, error: spaceError?.message ?? 'No se pudo crear el espacio personal.' };

    const { error: memberError } = await supabase
      .from('financial_space_members')
      .insert({ space_id: space.id, user_id: authData.user.id, role: 'owner' });

    if (memberError) return { success: false, error: memberError.message };

    return { success: true, space: { ...space, my_role: 'owner' } as FinancialSpace };
  } catch (error) {
    console.error('getOrCreatePersonalSpace error:', error);
    return { success: false, error: 'No se pudo preparar el espacio personal.' };
  }
}

export async function createFinancialSpace(input: FinancialSpaceInput): Promise<{ success: boolean; space?: FinancialSpace; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para crear espacios.' };

    const { data: space, error: spaceError } = await supabase
      .from('financial_spaces')
      .insert({ owner_id: authData.user.id, name: input.name.trim(), type: input.type })
      .select(SPACE_COLUMNS)
      .single();

    if (spaceError || !space) return { success: false, error: spaceError?.message ?? 'No se pudo crear el espacio.' };

    const { error: memberError } = await supabase
      .from('financial_space_members')
      .insert({ space_id: space.id, user_id: authData.user.id, role: 'owner' });

    if (memberError) return { success: false, error: memberError.message };

    return { success: true, space: { ...space, my_role: 'owner' } as FinancialSpace };
  } catch (error) {
    console.error('createFinancialSpace error:', error);
    return { success: false, error: 'Ocurrió un error creando el espacio.' };
  }
}

export async function updateFinancialSpace(id: string, input: FinancialSpaceInput): Promise<{ success: boolean; space?: FinancialSpace; error?: string }> {
  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('financial_spaces')
      .update({ name: input.name.trim(), type: input.type })
      .eq('id', id)
      .select(SPACE_COLUMNS)
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'No se pudo actualizar el espacio.' };
    return { success: true, space: data as FinancialSpace };
  } catch (error) {
    console.error('updateFinancialSpace error:', error);
    return { success: false, error: 'Ocurrió un error actualizando el espacio.' };
  }
}

export async function setFinancialSpaceActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('financial_spaces').update({ is_active: isActive }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('setFinancialSpaceActive error:', error);
    return { success: false, error: 'Ocurrió un error cambiando el estado del espacio.' };
  }
}

export async function deleteFinancialSpace(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', id);

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) return { success: false, error: 'El espacio tiene cuentas. Elimina o mueve las cuentas primero.' };

    const { error } = await supabase.from('financial_spaces').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('deleteFinancialSpace error:', error);
    return { success: false, error: 'Ocurrió un error eliminando el espacio.' };
  }
}

export interface SpaceMemberEntry {
  userId: string;
  role: SpaceRole;
  username: string | null;
  fullName: string | null;
  email: string | null;
}

export interface SpaceUserResult {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
}

async function getMySpaceRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string,
): Promise<SpaceRole | null> {
  const { data: member } = await supabase
    .from('financial_space_members')
    .select('role')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (member?.role) return member.role as SpaceRole;

  const { data: space } = await supabase
    .from('financial_spaces')
    .select('owner_id')
    .eq('id', spaceId)
    .maybeSingle();

  return space?.owner_id === userId ? 'owner' : null;
}

export async function listSpaceMembers(spaceId: string): Promise<{ success: boolean; members?: SpaceMemberEntry[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const myRole = await getMySpaceRole(supabase, spaceId, authData.user.id);
    if (!myRole) return { success: false, error: 'No tienes acceso a este espacio.' };

    const { data: members, error: membersError } = await supabase
      .from('financial_space_members')
      .select('user_id, role')
      .eq('space_id', spaceId);

    if (membersError) return { success: false, error: membersError.message };

    const userIds = (members ?? []).map((member) => member.user_id);
    if (userIds.length === 0) return { success: true, members: [] };

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .in('id', userIds);

    if (profilesError) return { success: false, error: profilesError.message };

    const profilesMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const entries: SpaceMemberEntry[] = (members ?? []).map((member) => {
      const profile = profilesMap.get(member.user_id);
      return {
        userId: member.user_id,
        role: member.role as SpaceRole,
        username: profile?.username ?? null,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
      };
    });

    return { success: true, members: entries };
  } catch (error) {
    console.error('listSpaceMembers error:', error);
    return { success: false, error: 'No se pudieron cargar los miembros.' };
  }
}

export async function searchUsersForSpaceAccess(spaceId: string, query: string): Promise<{ success: boolean; users?: SpaceUserResult[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const myRole = await getMySpaceRole(supabase, spaceId, authData.user.id);
    if (myRole !== 'owner' && myRole !== 'admin') {
      return { success: false, error: 'Solo el propietario o un admin puede invitar miembros.' };
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return { success: true, users: [] };

    const { data: members } = await supabase
      .from('financial_space_members')
      .select('user_id')
      .eq('space_id', spaceId);
    const existingIds = new Set((members ?? []).map((member) => member.user_id));
    existingIds.add(authData.user.id);

    const searchCondition = `username.ilike.%${normalizedQuery}%,full_name.ilike.%${normalizedQuery}%,email.ilike.%${normalizedQuery}%`;
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, email')
      .or(searchCondition)
      .limit(20);

    if (profilesError) return { success: false, error: profilesError.message };

    const users = (profiles ?? [])
      .filter((profile) => !existingIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        username: profile.username ?? null,
        fullName: profile.full_name ?? null,
        email: profile.email ?? null,
      }));

    return { success: true, users };
  } catch (error) {
    console.error('searchUsersForSpaceAccess error:', error);
    return { success: false, error: 'Ocurrió un error buscando usuarios.' };
  }
}

export async function addSpaceMember(spaceId: string, targetUserId: string, role: Exclude<SpaceRole, 'owner'>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const myRole = await getMySpaceRole(supabase, spaceId, authData.user.id);
    if (myRole !== 'owner' && myRole !== 'admin') {
      return { success: false, error: 'Solo el propietario o un admin puede invitar miembros.' };
    }

    const { error } = await supabase
      .from('financial_space_members')
      .upsert({ space_id: spaceId, user_id: targetUserId, role }, { onConflict: 'space_id,user_id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('addSpaceMember error:', error);
    return { success: false, error: 'Ocurrió un error agregando el miembro.' };
  }
}

export async function updateSpaceMemberRole(spaceId: string, targetUserId: string, role: Exclude<SpaceRole, 'owner'>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const myRole = await getMySpaceRole(supabase, spaceId, authData.user.id);
    if (myRole !== 'owner' && myRole !== 'admin') {
      return { success: false, error: 'Solo el propietario o un admin puede cambiar roles.' };
    }

    const { data: existing } = await supabase
      .from('financial_space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'El usuario no es miembro de este espacio.' };
    if (existing.role === 'owner') return { success: false, error: 'No puedes cambiar el rol del propietario.' };

    const { error } = await supabase
      .from('financial_space_members')
      .update({ role })
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('updateSpaceMemberRole error:', error);
    return { success: false, error: 'Ocurrió un error actualizando el rol.' };
  }
}

export async function removeSpaceMember(spaceId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Debes iniciar sesión para continuar.' };

    const isSelf = targetUserId === authData.user.id;
    const myRole = await getMySpaceRole(supabase, spaceId, authData.user.id);
    if (!isSelf && myRole !== 'owner' && myRole !== 'admin') {
      return { success: false, error: 'Solo el propietario o un admin puede quitar miembros.' };
    }

    const { data: existing } = await supabase
      .from('financial_space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existing?.role === 'owner') return { success: false, error: 'No puedes quitar al propietario del espacio.' };

    const { error } = await supabase
      .from('financial_space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('removeSpaceMember error:', error);
    return { success: false, error: 'Ocurrió un error quitando el miembro.' };
  }
}
