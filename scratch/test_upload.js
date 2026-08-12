import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const supabaseAnonKey = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function run() {
  console.log('[test] Iniciando cliente Supabase...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const email = 'test.temp.uploader.gmail.1786490400925@gmail.com';
  const password = 'TestPassword123!';

  try {
    console.log(`[test] Iniciando sesión para: ${email}`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    console.log('[test] Sesión iniciada con éxito.');

    // Obtener un token de acceso
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    if (!activeSession) {
      throw new Error('No se pudo establecer sesión activa.');
    }

    console.log('[test] Token JWT obtenido con éxito.');

    // Crear un archivo ficticio JPG pequeño (2KB)
    const dummyBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
      0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xff, 0xda, 0x00, 0x08,
      0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9
    ]);
    console.log('[test] Archivo ficticio JPG creado.');

    // Obtener el ID de algún lector para probar
    console.log('[test] Consultando lectores de la base de datos...');
    const { data: readers, error: readersError } = await supabase
      .from('readers')
      .select('id, name')
      .limit(1);

    if (readersError || !readers || readers.length === 0) {
      throw new Error(`Fallo al cargar lectores: ${readersError?.message || 'Catálogo vacío'}`);
    }

    const readerId = readers[0].id;
    console.log(`[test] Lector para la prueba: ${readers[0].name} (${readerId})`);

    // Preparar el FormData con una fecha de itinerario única
    const formData = new FormData();
    const blob = new Blob([dummyBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'test_image.jpg');
    formData.append('reader_id', readerId);
    formData.append('photo_type', 'ENTRADA');
    formData.append('itinerary', `IT-TEST-${Date.now()}`);

    const edgeUrl = 'https://umhexyqukxgnbztlbqbc.supabase.co/functions/v1/upload-photo';
    console.log(`[test] Enviando POST a Edge Function: ${edgeUrl}`);

    const startTime = Date.now();
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeSession.access_token}`
      },
      body: formData
    });

    const endTime = Date.now();
    console.log(`[test] Respuesta recibida en ${endTime - startTime} ms. Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log('[test] Contenido de respuesta:', responseText);

  } catch (err) {
    console.error('[test] ERROR OCURRIDO:', err);
  }
}

run();
