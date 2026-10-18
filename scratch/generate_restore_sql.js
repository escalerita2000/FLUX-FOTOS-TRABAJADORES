import fs from 'fs';
import readline from 'readline';

const backupFilePath = 'c:\\Users\\Master\\Downloads\\db_cluster-03-10-2026@11-45-37.backup\\db_cluster-03-10-2026@11-45-37.backup';
const outputPath = 'd:\\FLUX-FOTOS-TRABAJADORES\\supabase\\restore_data.sql';

async function generate() {
  const fileStream = fs.createReadStream(backupFilePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let mode = null;
  const readers = [];
  const reports = [];
  const photos = [];

  for await (const line of rl) {
    if (line.startsWith('COPY public.readers ')) { mode = 'readers'; continue; }
    if (line.startsWith('COPY public.daily_reports ')) { mode = 'reports'; continue; }
    if (line.startsWith('COPY public.photo_records ')) { mode = 'photos'; continue; }
    if (line === '\\.') { mode = null; continue; }

    if (mode === 'readers') {
      const [id, name, created_at] = line.split('\t');
      readers.push({ id, name, created_at });
    } else if (mode === 'reports') {
      const [id, reader_id, report_date, itinerary, created_by, created_at, updated_at] = line.split('\t');
      reports.push({ id, reader_id, report_date, itinerary, created_by, created_at, updated_at });
    } else if (mode === 'photos') {
      const [id, reader_id, capture_date, photo_type, original_name, stored_name, storage_path, uploaded_by, file_size, mime_type, created_at, supported_reader_id] = line.split('\t');
      photos.push({ id, reader_id, capture_date, photo_type, original_name, stored_name, storage_path, uploaded_by, file_size, mime_type, created_at, supported_reader_id });
    }
  }

  console.log(`Parsed ${readers.length} readers, ${reports.length} reports, ${photos.length} photos.`);

  let sql = `-- ==============================================================================
-- RESTORE SCRIPT FOR LECTORES FOTOS
-- Datos históricos recuperados del backup db_cluster-03-10-2026@11-45-37.backup
-- Preserva los UUIDs originales, fechas, relaciones e integridad referencial.
-- ==============================================================================

-- 1. RESTAURAR CATÁLOGO DE LECTORES (34 registros)
INSERT INTO public.readers (id, name, created_at) VALUES\n`;

  sql += readers.map(r => 
    `('${r.id}', '${r.name.replace(/'/g, "''")}', '${r.created_at}')`
  ).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

  sql += `-- 2. RESTAURAR REPORTES DE ITINERARIOS DIARIOS (569 registros)
INSERT INTO public.daily_reports (id, reader_id, report_date, itinerary, created_by, created_at, updated_at) VALUES\n`;

  sql += reports.map(r => 
    `('${r.id}', '${r.reader_id}', '${r.report_date}', '${r.itinerary.replace(/'/g, "''")}', '${r.created_by}', '${r.created_at}', '${r.updated_at}')`
  ).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

  sql += `-- 3. RESTAURAR REGISTROS DE FOTOGRAFÍAS (1030 registros)
INSERT INTO public.photo_records (id, reader_id, capture_date, photo_type, original_name, stored_name, storage_path, uploaded_by, file_size, mime_type, created_at, supported_reader_id) VALUES\n`;

  sql += photos.map(p => {
    const supported = (p.supported_reader_id && p.supported_reader_id !== '\\N') ? `'${p.supported_reader_id}'` : 'NULL';
    return `('${p.id}', '${p.reader_id}', '${p.capture_date}', '${p.photo_type}', '${p.original_name.replace(/'/g, "''")}', '${p.stored_name.replace(/'/g, "''")}', '${p.storage_path.replace(/'/g, "''")}', '${p.uploaded_by}', ${p.file_size}, '${p.mime_type}', '${p.created_at}', ${supported})`;
  }).join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';

  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log('Saved restore SQL to:', outputPath);
}

generate().catch(console.error);
