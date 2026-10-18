-- ==============================================================================
-- MIGRACIÓN: 20261018010000_authorized_supervisors_whitelist.sql
-- Proyecto: LECTORES FOTOS (umhexyqukxgnbztlbqbc)
-- Propósito: Implementación de Lista Blanca Explícita de Supervisores Autorizados (OPCIÓN B)
--
-- PRINCIPIOS DE SEGURIDAD Y MÍNIMO PRIVILEGIO:
-- 1. NO se modifican, eliminan ni truncan tablas existentes (readers, daily_reports, photo_records).
-- 2. NO se conceden permisos directos sobre auth.users a authenticated ni a anon.
-- 3. Funciones SECURITY DEFINER endurecidas con SET search_path = '' y calificación
--    explícita de todos los esquemas (public, auth) para mitigar search_path poisoning.
-- 4. La función auxiliar is_authorized_supervisor() no recibe parámetros (0 argumentos),
--    evaluando exclusivamente auth.uid() para eliminar vectores de enumeración.
-- 5. Se REVOCA el permiso EXECUTE sobre is_authorized_supervisor() a authenticated y anon,
--    quedando de uso exclusivo interno para SECURITY DEFINER y service_role.
-- 6. Se restringe el acceso de lectura de correos ÚNICAMENTE a los supervisores autorizados.
-- 7. Se bloquea de forma estricta (REVOKE INSERT, UPDATE, DELETE) cualquier modificación
--    directa sobre la lista blanca por parte de usuarios autenticados o anónimos.
-- 8. Se revocan explícitamente todos los privilegios sobre funciones y vistas a PUBLIC y anon,
--    eliminando cualquier ACL heredada o preexistente en la vista supervisor_emails.
-- 9. En la inserción inicial se utiliza ON CONFLICT DO NOTHING para preservar datos existentes.
-- 10. Se adapta la vista public.supervisor_emails y la función public.get_supervisor_emails()
--     conservando exactamente los tipos originales (id UUID, email character varying(255)).
-- ==============================================================================

-- 1. CREACIÓN DE LA TABLA DE SUPERVISORES AUTORIZADOS
CREATE TABLE IF NOT EXISTS public.authorized_supervisors (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying(255) NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.authorized_supervisors OWNER TO postgres;

-- 2. FUNCIÓN AUXILIAR SECURITY DEFINER (ENDURECIDA: search_path = '', SIN PARÁMETROS)
-- Evalúa estrictamente (SELECT auth.uid()), evitando que un usuario pruebe otros UUIDs.
CREATE OR REPLACE FUNCTION public.is_authorized_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.authorized_supervisors
        WHERE user_id = (SELECT auth.uid())
    );
$$;

ALTER FUNCTION public.is_authorized_supervisor() OWNER TO postgres;

-- 3. HABILITACIÓN DE RLS EN LA TABLA
ALTER TABLE public.authorized_supervisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select_own_supervisor_record" ON public.authorized_supervisors;
DROP POLICY IF EXISTS "allow_select_authorized_supervisors" ON public.authorized_supervisors;

-- Política SELECT de la tabla: Evaluación directa sin recursión y sin enumeración.
-- Cada usuario solo puede ver su propia fila si existe; no puede ver las de otros directamente en la tabla.
CREATE POLICY "allow_select_own_supervisor_record"
ON public.authorized_supervisors
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

-- 4. CONTROL ESTRICTO DE PRIVILEGIOS SOBRE LA TABLA (PROHIBIR ESCRITURA DIRECTA)
REVOKE ALL PRIVILEGES ON TABLE public.authorized_supervisors FROM PUBLIC CASCADE;
REVOKE ALL PRIVILEGES ON TABLE public.authorized_supervisors FROM anon CASCADE;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.authorized_supervisors FROM authenticated;
GRANT SELECT ON TABLE public.authorized_supervisors TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.authorized_supervisors TO service_role;

-- 5. REVOCACIÓN DE EXECUTE EN FUNCIÓN AUXILIAR A AUTHENTICATED (MÍNIMO PRIVILEGIO)
-- Al no usarse en la política RLS directa, se revoca EXECUTE a authenticated.
-- Solo service_role y funciones SECURITY DEFINER (como postgres) pueden invocarla.
REVOKE ALL PRIVILEGES ON FUNCTION public.is_authorized_supervisor() FROM PUBLIC CASCADE;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_authorized_supervisor() FROM anon CASCADE;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_authorized_supervisor() FROM authenticated CASCADE;
GRANT EXECUTE ON FUNCTION public.is_authorized_supervisor() TO service_role;

-- 6. POBLACIÓN INICIAL DE LA LISTA BLANCA (PRESERVANDO DATOS EXISTENTES)
-- Supervisor operativo principal confirmado por auditoría (99.9% de fotos y reportes operativos)
INSERT INTO public.authorized_supervisors (user_id, email, full_name)
VALUES (
    'ae2fc88a-efc8-4a93-890d-831d5e6ef0eb',
    'lassojose918@gmail.com',
    'José Lasso'
)
ON CONFLICT (user_id) DO NOTHING;

-- NOTA AUDITORÍA: El usuario 'ef7f4d9c-1c62-47df-9835-69fd1d2cb473' (test.temp.uploader.gmail.1786490400925@gmail.com)
-- fue identificado como cuenta de prueba (1 reporte y 1 foto de test el 2026-08-11).
-- Se excluye de producción por seguridad.

-- 7. FUNCIÓN RPC public.get_supervisor_emails() (ENDURECIDA: search_path = '')
-- Puerta de enlace segura utilizada por el frontend (db.ts)
CREATE OR REPLACE FUNCTION public.get_supervisor_emails()
RETURNS TABLE (id UUID, email character varying(255))
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT
        a.user_id AS id,
        a.email
    FROM public.authorized_supervisors a
    WHERE public.is_authorized_supervisor();
$$;

ALTER FUNCTION public.get_supervisor_emails() OWNER TO postgres;

-- Privilegios sobre la función get_supervisor_emails
REVOKE ALL PRIVILEGES ON FUNCTION public.get_supervisor_emails() FROM PUBLIC CASCADE;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_supervisor_emails() FROM anon CASCADE;
GRANT EXECUTE ON FUNCTION public.get_supervisor_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supervisor_emails() TO service_role;

-- 8. ADAPTACIÓN DE LA VISTA public.supervisor_emails
-- Se elimina la vista anterior para evitar el error de cambio de tipo 42P16
-- (de character varying(255) a character varying) y limpiar ACL preexistente de anon.
DROP VIEW IF EXISTS public.supervisor_emails CASCADE;

CREATE VIEW public.supervisor_emails AS
SELECT id, email
FROM public.get_supervisor_emails();

ALTER VIEW public.supervisor_emails OWNER TO postgres;

-- Revocar explícitamente TODOS los privilegios heredados de la vista
REVOKE ALL PRIVILEGES ON TABLE public.supervisor_emails FROM PUBLIC CASCADE;
REVOKE ALL PRIVILEGES ON TABLE public.supervisor_emails FROM anon CASCADE;
REVOKE ALL PRIVILEGES ON TABLE public.supervisor_emails FROM authenticated CASCADE;

-- Conceder únicamente SELECT a authenticated y control a service_role
GRANT SELECT ON TABLE public.supervisor_emails TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.supervisor_emails TO service_role;
