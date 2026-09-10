-- SQL para arreglar las políticas de RLS en la tabla wallet_permissions
-- El problema actual es que probablemente solo permite a un usuario verse a sí mismo, 
-- pero no permite que el OWNER de la wallet gestione los accesos de otros.

-- 1. Habilitar RLS en la tabla (por si acaso no está)
ALTER TABLE wallet_permissions ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can view their own permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Owners can manage wallet permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Users can view permissions of wallets they have access to" ON wallet_permissions;
DROP POLICY IF EXISTS "View wallet permissions" ON wallet_permissions;
DROP POLICY IF EXISTS "Manage wallet permissions" ON wallet_permissions;

-- 3. Nueva Política: Ver accesos
-- Un usuario puede ver los permisos de una wallet si:
-- a) Es el OWNER de la wallet (en la tabla wallets)
-- b) Es el propietario del permiso
CREATE POLICY "View wallet permissions"
ON wallet_permissions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM wallets
    WHERE wallets.id = wallet_permissions.wallet_id
    AND wallets.created_by = auth.uid()
  )
);

-- 4. Nueva Política: Insertar/Actualizar/Borrar accesos (Gestión)
-- Solo el OWNER (creador de la wallet) puede gestionar permisos
CREATE POLICY "Manage wallet permissions"
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

-- Nota: Si usas UPSERT, necesitas permisos de INSERT y UPDATE. 
-- La política 'FOR ALL' ya los cubre.
