export interface Reader {
  id: string;
  name: string;
  created_at: string;
}

export type PhotoType = 'ENTRADA' | 'SALIDA' | 'APOYO';

export interface PhotoRecord {
  id: string;
  reader_id: string;
  capture_date: string;
  photo_type: PhotoType;
  original_name: string;
  stored_name: string;
  storage_path: string;
  uploaded_by: string;
  file_size: number;
  mime_type: string;
  supported_reader_id?: string | null;
  created_at: string;
  // Extended fields for UI
  reader?: Reader;
  uploader_email?: string;
  supported_reader?: Reader | null;
}

export interface ReaderDailyStatus {
  reader: Reader;
  itinerary: string | null;
  entradaRecord: PhotoRecord | null;
  salidaRecord: PhotoRecord | null;
  apoyoRecords: PhotoRecord[];
}

export interface DailySummary {
  date: string;
  totalReaders: number;
  entradasCount: number;
  salidasCount: number;
  completedCount: number;
  pendingCount: number;
  apoyosCount: number;      // Nuevo contador de apoyos realizados
  itinerariosCount: number;  // Nuevo contador de itinerarios registrados
}

export interface MonthlyStats {
  monthYear: string;
  totalReaders: number;
  entradasCount: number;
  salidasCount: number;
  totalPhotos: number;
  processedDays: number;
  completedCount: number;
  pendingCount: number;
  apoyosCount: number;       // Nuevo
}
