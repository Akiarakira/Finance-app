-- SQL para diagnosticar y arreglar completamente las políticas de RLS
-- Ejecutar paso a paso para identificar qué causa la recursión

-- Paso 1: Ver todas las políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'wallet_permissions';

-- Paso 2: Eliminar TODAS las políticas de wallet_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Owners can manage wallet permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Users can view permissions of wallets they have access to" ON wallet_permissions;
DROP POLICY IF EXISTS "View wallet permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Manage wallet permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "wallet_permissions_policy" ON wallet_permissions;

-- Verificar que no quedan políticas
SELECT count(*) as remaining_policies 
FROM pg_policies 
WHERE tablename = 'wallet_permissions';

-- Paso 3: Crear política SIMPLE sin recursión
-- Solo permitir al creador de la wallet gestionar y ver permisos
CREATE POLICY "wallet_permissions_policy"
ON wallet_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_permissions.wallet_id
    AND wallets.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_permissions.wallet_id
    AND wallets.created_by = auth.uid()
  )
);

-- Paso 4: Verificar la política creada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'wallet_permissions';

-- Paso 5: Probar la política (ejecutar como el usuario actual)
-- Esto debería funcionar sin errores de recursión
SELECT * FROM wallet_permissions WHERE wallet_id = 'TU_WALLET_ID_AQUI';
