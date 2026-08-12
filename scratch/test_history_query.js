import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umhexyqukxgnbztlbqbc.supabase.co';
const supabaseAnonKey = 'sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15';

async function run() {
  console.log('[test-history] Iniciando cliente Supabase...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const email = 'test.temp.uploader.gmail.1786490400925@gmail.com';
  const password = 'TestPassword123!';

  try {
    console.log(`[test-history] Iniciando sesión para: ${email}`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    console.log('[test-history] Sesión iniciada con éxito.');

    console.log('[test-history] Probando consulta corregida (con desambiguación)');
    const { data: records, error } = await supabase
      .from('photo_records')
      .select('*, reader:readers!reader_id(*), supervisor:supervisor_emails(email), supported_reader:readers!supported_reader_id(id, name)')
      .limit(5);
      
    if (error) {
      console.error('[test-history] ERROR en consulta desambiguada:', error);
    } else {
      console.log('[test-history] Éxito. Registros obtenidos:', records.length);
      if (records.length > 0) {
        console.log('[test-history] Primer registro:', JSON.stringify(records[0], null, 2));
      }
    }

  } catch (err) {
    console.error('[test-history] EXCEPCIÓN:', err);
  }
}

run();
