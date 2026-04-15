-- SQL para crear trigger que automáticamente cree perfil al registrarse
-- Esto soluciona el problema donde solo se crea auth.users pero no profiles

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en profiles con el ID del usuario de auth.users
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que se ejecute después de insertar nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Para usuarios existentes que no tienen perfil, crearlos manualmente
INSERT INTO public.profiles (id, email)
SELECT 
  au.id, 
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Verificar que los perfiles se crearon correctamente
SELECT COUNT(*) as profiles_count FROM public.profiles;
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT p.*, au.email FROM public.profiles p 
JOIN auth.users au ON p.id = au.id 
WHERE au.email = 'andreinadibrigida8@gmail.com';
