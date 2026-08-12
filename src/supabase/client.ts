import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL o Anon Key no encontradas. Asegúrate de configurar el archivo .env con las credenciales correctas.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
