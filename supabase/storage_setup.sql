-- 1. Crear el bucket privado lectores-fotos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lectores-fotos', 
    'lectores-fotos', 
    false, -- bucket privado
    5242880, -- límite de 5MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas de Storage previas si existen
DROP POLICY IF EXISTS "Allow select objects for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert objects for authenticated users" ON storage.objects;

-- 4. Crear políticas específicas de lectura (SELECT) e inserción (INSERT) para usuarios autenticados
CREATE POLICY "Allow select objects for authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lectores-fotos');

CREATE POLICY "Allow insert objects for authenticated users"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lectores-fotos' AND auth.uid() IS NOT NULL);
