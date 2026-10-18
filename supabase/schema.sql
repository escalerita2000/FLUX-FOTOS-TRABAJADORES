-- ==============================================================================
-- SCHEMA DEFINITION FOR LECTORES FOTOS
-- Incluye Catálogo Maestro con los 34 lectores reales y correcciones de RLS
-- ==============================================================================

-- 1. Habilitar extensión pgcrypto para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabla de Lectores (Catálogo Maestro)
CREATE TABLE IF NOT EXISTS public.readers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Reportes Diarios de Itinerarios
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES public.readers(id) ON DELETE RESTRICT,
    report_date DATE NOT NULL,
    itinerary VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_reader_report_date UNIQUE (reader_id, report_date)
);

-- 4. Tabla de Registros de Fotografías
CREATE TABLE IF NOT EXISTS public.photo_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES public.readers(id) ON DELETE RESTRICT,
    capture_date DATE NOT NULL,
    photo_type VARCHAR(10) NOT NULL CHECK (photo_type IN ('ENTRADA', 'SALIDA', 'APOYO')),
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    supported_reader_id UUID REFERENCES public.readers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices parciales únicos para impedir duplicados de entrada y salida
CREATE UNIQUE INDEX IF NOT EXISTS unique_entrance_per_day ON public.photo_records (reader_id, capture_date) WHERE (photo_type = 'ENTRADA');
CREATE UNIQUE INDEX IF NOT EXISTS unique_exit_per_day ON public.photo_records (reader_id, capture_date) WHERE (photo_type = 'SALIDA');

-- 5. Catálogo Maestro de Lectores (34 Trabajadores Reales con sus UUIDs exactos)
INSERT INTO public.readers (id, name, created_at) VALUES
('7521b1c9-34a1-4447-a80f-5cc7a8a76b52', 'MIGUEL DARIO VELASQUEZ PIMIENTA', '2026-08-11 19:31:35.165134+00'),
('d3f1f145-9a3d-46e8-93a0-83f1e1cb45f2', 'JOSE ALDAIR AYOLA MEJIA', '2026-08-11 19:31:35.165134+00'),
('f977f0e8-f19a-4f23-a33a-1a942b04a268', 'ELIAS SALIN SUAREZ GOMEZ', '2026-08-11 19:31:35.165134+00'),
('2fd83494-1a7e-4a6f-916f-ce4a6b4aeeb1', 'MEIDER DAVID MOVIL MAESTRE', '2026-08-11 19:31:35.165134+00'),
('2a73ccc4-af20-4f82-aca2-23b74d49ce42', 'ARLENSON MIGUEL BERRIO TORO', '2026-08-11 19:31:35.165134+00'),
('ce7907dc-deb9-4fdb-b5a5-953623bcc161', 'JHON JAIRO HERNANDEZ ARRIETA', '2026-08-11 19:31:35.165134+00'),
('70e348bd-03c1-4560-80c1-66a43ff2d916', 'FRANCISCO JAVIER PUERTA HERNANDEZ', '2026-08-11 19:31:35.165134+00'),
('4ff29f97-b636-4dde-a9b5-8287a70b2579', 'CARLOS BONIET AREVALO IBARRA', '2026-08-11 19:31:35.165134+00'),
('b6cced24-454f-47ca-872b-867f13393bcf', 'YAFET ALEXANDER MOSCOTE ZUÑIGA', '2026-08-11 19:31:35.165134+00'),
('4b8cc374-536c-49d0-8a1d-73ab29a0fa82', 'JAVIER ENRIQUEZ YEPES TORREGROZA', '2026-08-11 19:31:35.165134+00'),
('d7e765f5-bd62-4c76-a7f7-edeb8b116c03', 'ZHARICK JISETH PERALTA NIEVES', '2026-08-11 19:31:35.165134+00'),
('02f515c1-2d14-463e-b475-26d6da0358a0', 'ALEXIS BULA MENDOZA', '2026-08-11 19:31:35.165134+00'),
('ec0b45d9-5a09-4da8-9225-986fd21c2996', 'SIGIFREDO BULA MENDOZA', '2026-08-11 19:31:35.165134+00'),
('2b4360cb-a646-4b88-8f98-95f2c0afd545', 'JIMMY ENRIQUE MENDOZA MORALES', '2026-08-11 19:31:35.165134+00'),
('3795bb88-6066-48c5-a782-0dfbfdbac99d', 'JOSE ALFONZO FUENTES DIAZ', '2026-08-11 19:31:35.165134+00'),
('edf8faf4-57ad-44e8-84b0-8c2e59a98a0f', 'ARNOL YAMITH REALES OÑATE', '2026-08-11 19:31:35.165134+00'),
('ca50ad6f-2819-4826-9774-f9195aab2295', 'JESUS ALBERTO BULA RAMIREZ', '2026-08-11 19:31:35.165134+00'),
('cf9bc509-9710-4481-b0a0-b7a4ef555661', 'DEIVER DE JESUS DEL VALLE BARRAZA', '2026-08-11 19:31:35.165134+00'),
('e19fc9aa-5403-4ca2-ab09-27b2fb373588', 'JAIME JAVIER MENDOZA MORALES', '2026-08-11 19:31:35.165134+00'),
('b31a4d06-c325-4665-8446-8e15cbb57f01', 'VICTOR FERNANDO ALVAREZ ESTRADA', '2026-08-11 19:31:35.165134+00'),
('e74177fa-5464-4849-98e1-7e0887adccb1', 'NERIO LUIS BRITO PITRE', '2026-08-11 19:31:35.165134+00'),
('2a5386a8-a0aa-4435-9fcc-a303aaa24e6d', 'CESAR FERNANDO LEON RODRIGUEZ', '2026-08-11 19:31:35.165134+00'),
('3fbff178-b135-44be-b1e5-3de27f8b1c7b', 'MANUEL DE JESUS MARQUEZ ARRIETA', '2026-08-11 19:31:35.165134+00'),
('b87d0aad-377d-4f08-a496-0246c20dcc51', 'FREDDY ENRIQUE MARQUEZ URBINA', '2026-08-11 19:31:35.165134+00'),
('2844a7c1-665e-41e9-99ca-6839010bbe9c', 'RAFAEL DAVID FREYLL MARTINEZ', '2026-08-11 19:31:35.165134+00'),
('49f44c24-b79d-40f8-9aea-b99a7f3178a4', 'ALEXANDER RAFAEL AGUILAR DUARTE', '2026-08-11 19:31:35.165134+00'),
('31858e28-4822-4931-bab4-75bbceee1084', 'JOSE LUIS ROSADO ROBLES', '2026-08-11 19:31:35.165134+00'),
('7e6e686c-a016-4783-9f8f-df560d6a5b27', 'DARIO ENRIQUE SARMIENTO CORSO', '2026-08-11 19:31:35.165134+00'),
('611ef93f-fae8-4c04-903c-27e23e01d198', 'ALEXIS MARTINEZ CURVELO', '2026-08-11 19:31:35.165134+00'),
('5614a0ad-9a16-43d6-859c-c3e7f1c5602e', 'JAIME LUIS CHAVEZ MURGAS', '2026-08-11 19:31:35.165134+00'),
('b6df0a99-d5c3-4376-9284-29dbc7c71c69', 'YURANIS PATRICIA GARCIA NUÑEZ', '2026-08-11 19:31:35.165134+00'),
('9767d77f-eb43-44ec-af02-faa115d9dd10', 'YEFERSON RICARDO EPIAY IGUARAN', '2026-08-11 19:31:35.165134+00'),
('e61fb956-b175-45fc-b5ee-d1b156cf8f8a', 'LUIS JOSE LARRADA RIVEIRA', '2026-09-02 22:29:57+00'),
('d3c42d9c-fed9-40e3-a248-f9b513f3454e', 'DAIN JOSUE VALDEZ COTES', '2026-09-02 22:33:00+00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 6. Solución de Acceso Seguro a Emails de Supervisores (Sin error 403)
CREATE OR REPLACE FUNCTION public.get_supervisor_emails()
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id, email::TEXT FROM auth.users;
$$;

GRANT EXECUTE ON FUNCTION public.get_supervisor_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supervisor_emails() TO service_role;

CREATE OR REPLACE VIEW public.supervisor_emails AS
SELECT id, email FROM public.get_supervisor_emails();

GRANT SELECT ON public.supervisor_emails TO authenticated;
GRANT SELECT ON public.supervisor_emails TO service_role;

GRANT SELECT (id, email) ON auth.users TO authenticated;
GRANT SELECT (id, email) ON auth.users TO service_role;

-- 7. Habilitar RLS (Row Level Security)
ALTER TABLE public.readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select readers for authenticated users" ON public.readers;
DROP POLICY IF EXISTS "Allow select daily_reports for authenticated users" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow insert daily_reports for authenticated users" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow update daily_reports for authenticated users" ON public.daily_reports;
DROP POLICY IF EXISTS "Allow select photo_records for authenticated users" ON public.photo_records;
DROP POLICY IF EXISTS "Allow insert photo_records for authenticated users" ON public.photo_records;

CREATE POLICY "Allow select readers for authenticated users" 
ON public.readers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow select daily_reports for authenticated users"
ON public.daily_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert daily_reports for authenticated users"
ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow update daily_reports for authenticated users"
ON public.daily_reports FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Allow select photo_records for authenticated users" 
ON public.photo_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert photo_records for authenticated users" 
ON public.photo_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

GRANT SELECT ON public.readers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT SELECT, INSERT ON public.photo_records TO authenticated;

-- 8. Función RPC para obtener fecha del servidor en America/Bogota
CREATE OR REPLACE FUNCTION public.get_current_bogota_date()
RETURNS DATE AS $$
BEGIN
  RETURN (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_current_bogota_date() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_bogota_date() TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bogota_date() TO service_role;
