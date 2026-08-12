import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[upload-photo] EDGE FUNCTION REQUEST: Received request method:', req.method);

  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  }

  try {
    console.log('[upload-photo] UPLOAD START: Starting upload validation');

    // 1. Validar token de autorización
    const authHeader = req.headers.get('Authorization')
    console.log('[upload-photo] AUTH CHECK: Checking authorization header');
    if (!authHeader) {
      console.warn('[upload-photo] UPLOAD ERROR: Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'No autorizado. Debe iniciar sesión.' }),
        { status: 401, headers: responseHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('[upload-photo] UPLOAD ERROR: Server configuration variables missing');
      return new Response(
        JSON.stringify({ error: 'Falta configuración en las variables de entorno del servidor.' }),
        { status: 500, headers: responseHeaders }
      )
    }

    // Cliente admin para operaciones con privilegios y validación del JWT de forma síncrona/directa
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)

    // Extraer token
    const token = authHeader.replace('Bearer ', '')
    // Usar la llamada auth.getUser(token) con el token JWT de forma explícita y stateless
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.warn('[upload-photo] UPLOAD ERROR: Invalid or expired session JWT', authError);
      return new Response(
        JSON.stringify({ error: `Sesión inválida o expirada: ${authError?.message || 'Token no válido'}` }),
        { status: 401, headers: responseHeaders }
      )
    }
    console.log('[upload-photo] AUTH SUCCESS: User verified as', user.email);

    // Parsear el body (debe ser multipart/form-data)
    console.log('[upload-photo] PARSE: Parsing multipart formData');
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const readerId = formData.get('reader_id') as string | null
    const photoType = formData.get('photo_type') as string | null
    const itinerary = formData.get('itinerary') as string | null
    const supportedReaderId = formData.get('supported_reader_id') as string | null

    console.log('[upload-photo] PARSE DETAILS:', {
      readerId,
      photoType,
      itinerary,
      supportedReaderId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    // 2. Validar parámetros requeridos
    if (!file || !readerId || !photoType || !itinerary) {
      console.warn('[upload-photo] UPLOAD ERROR: Missing parameters');
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos (file, reader_id, photo_type, itinerary).' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // 3. Validar tipo de foto
    const cleanPhotoType = photoType.toUpperCase()
    if (cleanPhotoType !== 'ENTRADA' && cleanPhotoType !== 'SALIDA' && cleanPhotoType !== 'APOYO') {
      console.warn('[upload-photo] UPLOAD ERROR: Invalid photo_type:', cleanPhotoType);
      return new Response(
        JSON.stringify({ error: 'El tipo de fotografía debe ser ENTRADA, SALIDA o APOYO.' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Validar lector principal
    const { data: reader, error: readerError } = await supabaseAdmin
      .from('readers')
      .select('id, name')
      .eq('id', readerId)
      .single()

    if (readerError || !reader) {
      console.warn('[upload-photo] UPLOAD ERROR: Lector not found:', readerId);
      return new Response(
        JSON.stringify({ error: 'El lector seleccionado no existe en el catálogo maestro.' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Validar lector apoyado si es tipo APOYO
    if (cleanPhotoType === 'APOYO') {
      if (!supportedReaderId) {
        console.warn('[upload-photo] UPLOAD ERROR: Missing supported_reader_id for APOYO');
        return new Response(
          JSON.stringify({ error: 'Debe seleccionar al trabajador apoyado.' }),
          { status: 400, headers: responseHeaders }
        )
      }

      if (supportedReaderId === readerId) {
        console.warn('[upload-photo] UPLOAD ERROR: Supporter and supported reader are the same');
        return new Response(
          JSON.stringify({ error: 'Un lector no puede apoyarse a sí mismo.' }),
          { status: 400, headers: responseHeaders }
        )
      }

      const { data: supportedReader, error: supportedError } = await supabaseAdmin
        .from('readers')
        .select('id, name')
        .eq('id', supportedReaderId)
        .single()

      if (supportedError || !supportedReader) {
        console.warn('[upload-photo] UPLOAD ERROR: Supported lector not found:', supportedReaderId);
        return new Response(
          JSON.stringify({ error: 'El trabajador apoyado seleccionado no existe.' }),
          { status: 400, headers: responseHeaders }
        )
      }
    }

    // 4. Obtener fecha de negocio controlada por el servidor (America/Bogota)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    const parts = formatter.formatToParts(now)
    const val = (type: string) => parts.find(p => p.type === type)?.value || ''
    
    const year = val('year')
    const month = val('month')
    const day = val('day')
    const hour = val('hour')
    const minute = val('minute')
    const second = val('second')
    
    const dateStr = `${year}-${month}-${day}` // YYYY-MM-DD
    const timeStr = `${hour}:${minute}:${second}` // HH:MM:SS

    console.log('[upload-photo] TIME: Current date in America/Bogota:', dateStr, timeStr);

    // 5. Verificar duplicados antes de subir (Exclusivo para ENTRADA y SALIDA)
    if (cleanPhotoType === 'ENTRADA' || cleanPhotoType === 'SALIDA') {
      console.log('[upload-photo] VAL_DUP: Checking duplicates for', cleanPhotoType);
      const { data: existingRecord, error: checkError } = await supabaseAdmin
        .from('photo_records')
        .select('id')
        .eq('reader_id', readerId)
        .eq('capture_date', dateStr)
        .eq('photo_type', cleanPhotoType)
        .maybeSingle()

      if (checkError) {
        console.error('[upload-photo] UPLOAD ERROR: Checking duplicates database error:', checkError);
        return new Response(
          JSON.stringify({ error: 'Error al verificar registros existentes en la base de datos.' }),
          { status: 500, headers: responseHeaders }
        )
      }

      if (existingRecord) {
        console.warn('[upload-photo] UPLOAD ERROR: Photo already registered for', cleanPhotoType);
        return new Response(
          JSON.stringify({ error: 'FOTOGRAFÍA YA REGISTRADA' }),
          { status: 409, headers: responseHeaders }
        )
      }
    }

    // 6. Sincronizar reporte diario (Upsert del itinerario)
    console.log('[upload-photo] VAL_REPORT: Upserting daily itinerary report');
    const { error: reportError } = await supabaseAdmin
      .from('daily_reports')
      .upsert(
        {
          reader_id: readerId,
          report_date: dateStr,
          itinerary: itinerary,
          created_by: user.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'reader_id,report_date' }
      );

    if (reportError) {
      console.error('[upload-photo] UPLOAD ERROR: Upsert daily report failed:', reportError);
      return new Response(
        JSON.stringify({ error: `Error al registrar el itinerario diario: ${reportError.message}` }),
        { status: 500, headers: responseHeaders }
      )
    }

    // Preparar nombres y rutas de almacenamiento
    const originalName = file.name
    const fileExtension = originalName.split('.').pop() || 'jpg'
    let storedName = ''
    let storagePath = ''

    if (cleanPhotoType === 'APOYO') {
      const uniqueId = crypto.randomUUID()
      storedName = `${uniqueId}.${fileExtension}`
      storagePath = `readers/${readerId}/${dateStr}/apoyo/${storedName}`
    } else {
      storedName = `${cleanPhotoType.toLowerCase()}.${fileExtension}`
      storagePath = `readers/${readerId}/${dateStr}/${storedName}`
    }

    console.log('[upload-photo] STORAGE: Target storage path:', storagePath);

    // Convertir el archivo a un buffer para subir
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // 7. Subir archivo a Storage (usando cliente Admin)
    console.log('[upload-photo] STORAGE UPLOAD: Uploading file buffer to Supabase Storage');
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('lectores-fotos')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true // Habilitar sobreescritura para reintentos o reposición
      })

    if (uploadError) {
      console.error('[upload-photo] UPLOAD ERROR: Storage upload failed:', uploadError);
      return new Response(
        JSON.stringify({ error: `No se pudo cargar la fotografía al almacenamiento: ${uploadError.message}` }),
        { status: 500, headers: responseHeaders }
      )
    }
    console.log('[upload-photo] STORAGE SUCCESS: File uploaded successfully');

    // 8. Insertar registro de la foto en la base de datos
    console.log('[upload-photo] DATABASE INSERT: Inserting photo metadata into photo_records');
    const { data: recordData, error: insertError } = await supabaseAdmin
      .from('photo_records')
      .insert({
        reader_id: readerId,
        capture_date: dateStr,
        photo_type: cleanPhotoType,
        original_name: originalName,
        stored_name: storedName,
        storage_path: storagePath,
        uploaded_by: user.id,
        file_size: file.size,
        mime_type: file.type,
        supported_reader_id: cleanPhotoType === 'APOYO' ? supportedReaderId : null
      })
      .select()
      .single()

    // 9. Compensación en caso de fallo al insertar en la base de datos (Rollback)
    if (insertError) {
      console.error('[upload-photo] UPLOAD ERROR: Postgres insert failed. Executing storage rollback.', insertError);
      
      // Eliminar el archivo de storage para evitar dejarlo huérfano (Caso B)
      await supabaseAdmin.storage
        .from('lectores-fotos')
        .remove([storagePath])

      // Comprobar si fue por violación de restricción única
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'FOTOGRAFÍA YA REGISTRADA' }),
          { status: 409, headers: responseHeaders }
        )
      }

      return new Response(
        JSON.stringify({ error: `Error al registrar metadatos en la base de datos: ${insertError.message}` }),
        { status: 500, headers: responseHeaders }
      )
    }

    console.log('[upload-photo] UPLOAD SUCCESS: Flow completed successfully for', cleanPhotoType);

    // 10. Devolver respuesta exitosa con metadatos y hora formateada de Bogotá
    return new Response(
      JSON.stringify({
        success: true,
        message: 'La fotografía se cargó correctamente.',
        record: recordData,
        bogotaTime: `${dateStr} ${timeStr}`
      }),
      { status: 200, headers: responseHeaders }
    )

  } catch (err: any) {
    console.error('[upload-photo] UPLOAD ERROR: Internal server exception:', err.message);
    return new Response(
      JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
      { status: 500, headers: responseHeaders }
    )
  }
})
