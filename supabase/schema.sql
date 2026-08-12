-- Habilitar extensión pgcrypto para UUID si es necesario
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de Lectores (Catálogo Maestro)
CREATE TABLE IF NOT EXISTS readers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Reportes Diarios de Itinerarios (Itinerario Terminado)
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES readers(id) ON DELETE RESTRICT,
    report_date DATE NOT NULL,
    itinerary VARCHAR(100) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un reporte de itinerario único por lector y fecha de negocio
    CONSTRAINT unique_reader_report_date UNIQUE (reader_id, report_date)
);

-- 3. Tabla de Registros de Fotografías
CREATE TABLE IF NOT EXISTS photo_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES readers(id) ON DELETE RESTRICT,
    capture_date DATE NOT NULL,
    photo_type VARCHAR(10) NOT NULL CHECK (photo_type IN ('ENTRADA', 'SALIDA', 'APOYO')),
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_size INTEGER NOT NULL, -- En bytes
    mime_type VARCHAR(100) NOT NULL,
    supported_reader_id UUID REFERENCES readers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices únicos parciales para asegurar que solo haya una entrada y una salida por día por lector
CREATE UNIQUE INDEX IF NOT EXISTS unique_entrance_per_day ON photo_records (reader_id, capture_date) WHERE (photo_type = 'ENTRADA');
CREATE UNIQUE INDEX IF NOT EXISTS unique_exit_per_day ON photo_records (reader_id, capture_date) WHERE (photo_type = 'SALIDA');

-- 4. Vista segura para exponer los emails de los supervisores (usuarios de auth.users)
CREATE OR REPLACE VIEW public.supervisor_emails AS
SELECT id, email FROM auth.users;

-- Otorgar permisos de lectura en la vista a los usuarios autenticados
GRANT SELECT ON public.supervisor_emails TO authenticated;

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_records ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Seguridad de Base de Datos
-- Limpiar políticas previas si existen
DROP POLICY IF EXISTS "Allow select readers for authenticated users" ON readers;
DROP POLICY IF EXISTS "Allow select daily_reports for authenticated users" ON daily_reports;
DROP POLICY IF EXISTS "Allow insert daily_reports for authenticated users" ON daily_reports;
DROP POLICY IF EXISTS "Allow update daily_reports for authenticated users" ON daily_reports;
DROP POLICY IF EXISTS "Allow select photo_records for authenticated users" ON photo_records;
DROP POLICY IF EXISTS "Allow insert photo_records for authenticated users" ON photo_records;

-- Políticas para readers (lectura para autenticados, no escritura)
CREATE POLICY "Allow select readers for authenticated users" 
ON readers FOR SELECT TO authenticated USING (true);

-- Políticas para daily_reports (lectura, inserción y actualización para autenticados)
CREATE POLICY "Allow select daily_reports for authenticated users"
ON daily_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert daily_reports for authenticated users"
ON daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow update daily_reports for authenticated users"
ON daily_reports FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Políticas para photo_records (lectura para autenticados)
CREATE POLICY "Allow select photo_records for authenticated users" 
ON photo_records FOR SELECT TO authenticated USING (true);

-- Políticas para photo_records (inserción para autenticados)
CREATE POLICY "Allow insert photo_records for authenticated users" 
ON photo_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Otorgar permisos de roles en tablas a usuarios autenticados
GRANT SELECT, INSERT, UPDATE ON public.daily_reports TO authenticated;
GRANT SELECT ON public.readers TO authenticated;
GRANT SELECT, INSERT ON public.photo_records TO authenticated;

-- 7. Función para obtener la fecha del servidor en America/Bogota
CREATE OR REPLACE FUNCTION get_current_bogota_date()
RETURNS DATE AS $$
BEGIN
  RETURN (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;
END;
$$ LANGUAGE plpgsql;

-- 8. Insertar catálogo maestro de lectores (33 registros)
INSERT INTO readers (name) VALUES
('MIGUEL DARIO VELASQUEZ PIMIENTA'),
('JOSE ALDAIR AYOLA MEJIA'),
('ELIAS SALIN SUAREZ GOMEZ'),
('MEIDER DAVID MOVIL MAESTRE'),
('ARLENSON MIGUEL BERRIO TORO'),
('JHON JAIRO HERNANDEZ ARRIETA'),
('FRANCISCO JAVIER PUERTA HERNANDEZ'),
('CARLOS BONIET AREVALO IBARRA'),
('YAFET ALEXANDER MOSCOTE ZUÑIGA'),
('JAVIER ENRIQUEZ YEPES TORREGROZA'),
('ZHARICK JISETH PERALTA NIEVES'),
('ALEXIS BULA MENDOZA'),
('SIGIFREDO BULA MENDOZA'),
('JIMMY ENRIQUE MENDOZA MORALES'),
('JOSE ALFONZO FUENTES DIAZ'),
('ARNOL YAMITH REALES OÑATE'),
('JESUS ALBERTO BULA RAMIREZ'),
('DEIVER DE JESUS DEL VALLE BARRAZA'),
('JAIME JAVIER MENDOZA MORALES'),
('VICTOR FERNANDO ALVAREZ ESTRADA'),
('NERIO LUIS BRITO PITRE'),
('SERGIO ELIAS AMAYA TONCEL'),
('CESAR FERNANDO LEON RODRIGUEZ'),
('MANUEL DE JESUS MARQUEZ ARRIETA'),
('FREDDY ENRIQUE MARQUEZ URBINA'),
('RAFAEL DAVID FREYLL MARTINEZ'),
('ALEXANDER RAFAEL AGUILAR DUARTE'),
('JOSE LUIS ROSADO ROBLES'),
('DARIO ENRIQUE SARMIENTO CORSO'),
('ALEXIS MARTINEZ CURVELO'),
('JAIME LUIS CHAVEZ MURGAS'),
('YURANIS PATRICIA GARCIA NUÑEZ'),
('YEFERSON RICARDO EPIAY IGUARAN')
ON CONFLICT (name) DO NOTHING;
