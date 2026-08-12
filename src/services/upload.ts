import { supabase } from '../supabase/client';

export interface UploadResult {
  success: boolean;
  message: string;
  record: any;
  bogotaTime: string;
}

/**
 * Sube una fotografía a través de la Edge Function en Supabase.
 * 
 * Incorpora los nuevos parámetros de Itinerario y Trabajador Apoyado (opcional).
 * Implementa una desconexión (timeout) automática de 30 segundos mediante AbortController.
 */
export async function uploadPhoto(
  file: File,
  readerId: string,
  photoType: 'ENTRADA' | 'SALIDA' | 'APOYO',
  itinerary: string,
  supportedReaderId?: string,
  onProgress?: (status: string) => void
): Promise<UploadResult> {
  onProgress?.('Preparando...');

  // 1. Obtener la sesión activa del usuario
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No autorizado. Inicie sesión nuevamente.');
  }

  // 2. Preparar el cuerpo de la petición (multipart/form-data)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('reader_id', readerId);
  formData.append('photo_type', photoType);
  formData.append('itinerary', itinerary);
  if (photoType === 'APOYO' && supportedReaderId) {
    formData.append('supported_reader_id', supportedReaderId);
  }

  // 3. Determinar la URL de la Edge Function
  const edgeUrl = import.meta.env.VITE_EDGE_FUNCTION_URL || 
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-photo`;

  console.log('[upload] Iniciando subida a Edge Function:', {
    edgeUrl,
    readerId,
    photoType,
    itinerary,
    supportedReaderId,
    fileName: file.name,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`
  });

  onProgress?.('Subiendo...');

  // 4. Implementar AbortController para Timeout de 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 segundos de límite

  try {
    // Enviar la petición HTTP
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formData,
      signal: controller.signal
    });

    // Limpiar el temporizador al recibir respuesta
    clearTimeout(timeoutId);

    onProgress?.('Procesando...');

    // 5. Procesar la respuesta del servidor
    if (!response.ok) {
      let errorMessage = 'Error al procesar la fotografía en el servidor.';
      try {
        const errJson = await response.json();
        errorMessage = errJson.error || errorMessage;
      } catch {
        // En caso de que no devuelva un JSON válido
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    onProgress?.('Sincronizado.');
    return result as UploadResult;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[upload] Error en uploadPhoto:', error);

    // Identificar si fue un error por timeout (AbortController)
    if (error.name === 'AbortError') {
      throw new Error('LA SUBIDA ESTÁ TARDANDO DEMASIADO. VERIFICA TU CONEXIÓN E INTENTA NUEVAMENTE.');
    }

    // Si el error es de red general (fetch falló)
    if (error.message === 'Failed to fetch') {
      throw new Error('Sin conexión. No se pudo conectar con el servidor de Supabase.');
    }

    throw error;
  }
}
