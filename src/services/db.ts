import { supabase } from '../supabase/client';
import type { Reader, PhotoRecord, ReaderDailyStatus, DailySummary, MonthlyStats } from '../types';
import { getReaders } from './readers';

// 1. Obtener la fecha actual en America/Bogota desde el servidor de Supabase (o fallback local)
export async function getBogotaDateFromServer(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_current_bogota_date');
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.warn('Fallo al obtener fecha del servidor, usando hora del cliente en America/Bogota:', err);
  }

  // Fallback local en zona horaria America/Bogota
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });
  return formatter.format(new Date()); // Retorna YYYY-MM-DD
}

// 2. Obtener el estado diario de todos los lectores
export async function getDailyStatus(dateStr: string): Promise<ReaderDailyStatus[]> {
  const readers = await getReaders();
  
  // Consultar reportes diarios (itinerarios)
  const { data: reports, error: reportsError } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('report_date', dateStr);

  if (reportsError) {
    console.error('Error al obtener itinerarios diarios:', reportsError);
  }

  // Consultar registros de fotos (con supervisor y apoyado si existe)
  const { data: records, error } = await supabase
    .from('photo_records')
    .select('*, supervisor:supervisor_emails(email), supported_reader:readers!supported_reader_id(id, name)')
    .eq('capture_date', dateStr);

  if (error) {
    console.error('Error al obtener registros diarios:', error);
    throw new Error('No se pudieron obtener los registros de hoy.');
  }

  return readers.map((reader) => {
    const readerRecords = records?.filter((r) => r.reader_id === reader.id) || [];
    
    // Obtener itinerario
    const reportForReader = reports?.find((rep) => rep.reader_id === reader.id) || null;
    const itinerary = reportForReader ? reportForReader.itinerary : null;

    // Buscar entrada y salida
    const entradaRecord = readerRecords.find((r) => r.photo_type === 'ENTRADA') || null;
    const salidaRecord = readerRecords.find((r) => r.photo_type === 'SALIDA') || null;
    const apoyoRecords = readerRecords.filter((r) => r.photo_type === 'APOYO');

    // Mapear campos extendidos
    if (entradaRecord) {
      entradaRecord.reader = reader;
      entradaRecord.uploader_email = entradaRecord.supervisor?.email;
    }
    if (salidaRecord) {
      salidaRecord.reader = reader;
      salidaRecord.uploader_email = salidaRecord.supervisor?.email;
    }
    apoyoRecords.forEach((apoyo) => {
      apoyo.reader = reader;
      apoyo.uploader_email = apoyo.supervisor?.email;
      apoyo.supported_reader = apoyo.supported_reader ? {
        id: apoyo.supported_reader.id,
        name: apoyo.supported_reader.name,
        created_at: '' // No requerida en UI
      } : null;
    });

    return {
      reader,
      itinerary,
      entradaRecord,
      salidaRecord,
      apoyoRecords,
    };
  });
}

// 3. Obtener resumen de estadísticas de un día específico
export async function getDailySummary(dateStr: string): Promise<DailySummary> {
  const dailyStatus = await getDailyStatus(dateStr);
  const totalReaders = dailyStatus.length;
  
  let entradasCount = 0;
  let salidasCount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let apoyosCount = 0;
  let itinerariosCount = 0;

  dailyStatus.forEach(({ entradaRecord, salidaRecord, apoyoRecords, itinerary }) => {
    if (entradaRecord) entradasCount++;
    if (salidaRecord) salidasCount++;
    if (itinerary) itinerariosCount++;
    apoyosCount += apoyoRecords.length;
    
    if (entradaRecord && salidaRecord) {
      completedCount++;
    } else {
      pendingCount++;
    }
  });

  return {
    date: dateStr,
    totalReaders,
    entradasCount,
    salidasCount,
    completedCount,
    pendingCount,
    apoyosCount,
    itinerariosCount
  };
}

// 4. Obtener estadísticas mensuales
export async function getMonthlyStats(monthYear: string): Promise<MonthlyStats> {
  const readers = await getReaders();
  const totalReaders = readers.length;

  const startDate = `${monthYear}-01`;
  const [year, month] = monthYear.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

  const { data: records, error } = await supabase
    .from('photo_records')
    .select('id, reader_id, capture_date, photo_type')
    .gte('capture_date', startDate)
    .lte('capture_date', endDate);

  if (error) {
    console.error('Error al obtener estadísticas mensuales:', error);
    throw new Error('No se pudieron obtener las estadísticas mensuales.');
  }

  const uniqueDays = new Set(records?.map((r) => r.capture_date) || []);
  const processedDays = uniqueDays.size;

  let entradasCount = 0;
  let salidasCount = 0;
  let apoyosCount = 0;
  
  const readerMap: Record<string, Record<string, { entrada: boolean; salida: boolean }>> = {};
  
  readers.forEach((r) => {
    readerMap[r.id] = {};
  });

  records?.forEach((rec) => {
    if (rec.photo_type === 'ENTRADA') entradasCount++;
    if (rec.photo_type === 'SALIDA') salidasCount++;
    if (rec.photo_type === 'APOYO') apoyosCount++;

    if (!readerMap[rec.reader_id]) return;
    if (!readerMap[rec.reader_id][rec.capture_date]) {
      readerMap[rec.reader_id][rec.capture_date] = { entrada: false, salida: false };
    }

    if (rec.photo_type === 'ENTRADA') readerMap[rec.reader_id][rec.capture_date].entrada = true;
    if (rec.photo_type === 'SALIDA') readerMap[rec.reader_id][rec.capture_date].salida = true;
  });

  let completedCount = 0;
  let pendingCount = 0;

  if (processedDays === 0) {
    pendingCount = totalReaders;
  } else {
    readers.forEach((reader) => {
      let isCompleteEveryDay = true;
      let hasAnyActivity = false;

      uniqueDays.forEach((dayStr) => {
        const dayActivity = readerMap[reader.id][dayStr];
        if (dayActivity) {
          hasAnyActivity = true;
          if (!dayActivity.entrada || !dayActivity.salida) {
            isCompleteEveryDay = false;
          }
        } else {
          isCompleteEveryDay = false;
        }
      });

      if (hasAnyActivity && isCompleteEveryDay) {
        completedCount++;
      } else {
        pendingCount++;
      }
    });
  }

  return {
    monthYear,
    totalReaders,
    entradasCount,
    salidasCount,
    totalPhotos: (records?.length || 0),
    processedDays,
    completedCount,
    pendingCount,
    apoyosCount
  };
}

// 5. Obtener datos para la matriz mensual (todos los registros del mes)
export async function getMonthlyMatrixData(monthYear: string): Promise<{
  records: PhotoRecord[];
  readers: Reader[];
}> {
  const readers = await getReaders();
  const startDate = `${monthYear}-01`;
  const [year, month] = monthYear.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

  const { data: records, error } = await supabase
    .from('photo_records')
    .select('*, supervisor:supervisor_emails(email), supported_reader:readers!supported_reader_id(id, name)')
    .gte('capture_date', startDate)
    .lte('capture_date', endDate);

  if (error) {
    console.error('Error al obtener datos de la matriz mensual:', error);
    throw new Error('No se pudo cargar la cobertura mensual.');
  }

  const formattedRecords = (records || []).map((r) => ({
    ...r,
    reader: readers.find((rd) => rd.id === r.reader_id),
    uploader_email: r.supervisor?.email,
    supported_reader: r.supported_reader ? {
      id: r.supported_reader.id,
      name: r.supported_reader.name,
      created_at: ''
    } : null
  }));

  return {
    records: formattedRecords,
    readers,
  };
}

// 6. Consultar historial general de fotos con filtros
export async function getHistory(filters: {
  readerId?: string;
  date?: string;
  photoType?: string;
  uploaderId?: string;
}): Promise<PhotoRecord[]> {
  console.log("[HISTORY] START");
  console.log("[HISTORY] FILTERS", filters);
  console.log("[HISTORY] QUERY START");

  let query = supabase
    .from('photo_records')
    .select('*, reader:readers!reader_id(*), supervisor:supervisor_emails(email), supported_reader:readers!supported_reader_id(id, name)')
    .order('created_at', { ascending: false });

  if (filters.readerId) {
    query = query.eq('reader_id', filters.readerId);
  }
  if (filters.date) {
    query = query.eq('capture_date', filters.date);
  }
  if (filters.photoType) {
    query = query.eq('photo_type', filters.photoType);
  }
  if (filters.uploaderId) {
    query = query.eq('uploaded_by', filters.uploaderId);
  }

  const { data: records, error } = await query;
  if (error) {
    console.error("[HISTORY] ERROR", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    console.log("[HISTORY] QUERY FINISHED");
    throw new Error('No se pudo obtener el historial de fotografías.');
  }

  console.log("[HISTORY] DATA", records);
  console.log("[HISTORY] QUERY FINISHED");

  const formattedRecords = (records || []).map((r) => ({
    ...r,
    uploader_email: r.supervisor?.email,
    supported_reader: r.supported_reader ? {
      id: r.supported_reader.id,
      name: r.supported_reader.name,
      created_at: ''
    } : null
  }));

  if (formattedRecords.length === 0) {
    return [];
  }

  // Realizar join lógico de itinerarios en el cliente de manera optimizada
  try {
    const dates = Array.from(new Set(formattedRecords.map((r) => r.capture_date)));
    const readerIds = Array.from(new Set(formattedRecords.map((r) => r.reader_id)));

    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('reader_id, report_date, itinerary')
      .in('report_date', dates)
      .in('reader_id', readerIds);

    if (!reportsError && reports) {
      formattedRecords.forEach((rec) => {
        // Encontrar reporte para el lector y fecha del registro
        const rep = reports.find(
          (r) => r.reader_id === rec.reader_id && r.report_date === rec.capture_date
        );
        // Colocamos el itinerario en el record
        if (rep) {
          // Asociaremos el itinerario en una propiedad extendida para la UI
          (rec as any).itinerary = rep.itinerary;
        } else {
          (rec as any).itinerary = null;
        }
      });
    }
  } catch (repErr) {
    console.error('Error al asociar itinerarios al historial:', repErr);
  }

  return formattedRecords;
}

// 7. Obtener URL firmada temporal de descarga/visualización
export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('lectores-fotos')
    .createSignedUrl(storagePath, 300); // URL válida por 5 minutos (300s)

  if (error) {
    console.error('Error al obtener URL firmada:', error);
    throw new Error('No se pudo obtener enlace seguro de la fotografía.');
  }

  return data.signedUrl;
}

// 8. Obtener una lista de supervisores para los filtros de historial
export async function getSupervisors(): Promise<{ id: string; email: string }[]> {
  const { data, error } = await supabase
    .from('supervisor_emails')
    .select('*')
    .order('email', { ascending: true });

  if (error) {
    console.error('Error al obtener supervisores:', error);
    return [];
  }
  return data || [];
}
