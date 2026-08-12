import { supabase } from '../supabase/client';
import type { Reader } from '../types';

/**
 * Obtiene la lista completa de lectores desde la base de datos de Supabase,
 * ordenados alfabéticamente por nombre.
 * Si ocurre un error, registra toda la información técnica en la consola
 * y lanza una excepción descriptiva.
 */
export async function getReaders(): Promise<Reader[]> {
  const { data, error } = await supabase
    .from('readers')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error cargando lectores:', error);
    console.error('Detalles del error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error('Error al cargar el catálogo de lectores.');
  }

  return data || [];
}
