/**
 * Utilidades para manejo de fechas con zona horaria de Colombia (UTC-5)
 */

/**
 * Obtiene la fecha y hora actual en Colombia (UTC-5)
 * @returns Date object ajustado a hora colombiana
 */
export function getFechaHoraColombia(): Date {
  // Obtener la fecha/hora actual en UTC
  const ahoraUTC = new Date();
  
  // Colombia está en UTC-5, así que restamos 5 horas
  const OFFSET_COLOMBIA_HORAS = 5;
  const colombiaTime = new Date(ahoraUTC.getTime() - (OFFSET_COLOMBIA_HORAS * 60 * 60 * 1000));
  
  return colombiaTime;
}

/**
 * Convierte una fecha almacenada en la BD (que está en UTC/hora del servidor)
 * a hora colombiana para mostrar en el frontend
 * @param fecha Fecha en formato string o Date
 * @returns Date object ajustado a hora colombiana
 */
export function convertirAHoraColombia(fecha: string | Date): Date {
  const fechaOriginal = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  // La fecha viene en UTC, restamos 5 horas para obtener hora de Colombia
  const OFFSET_COLOMBIA_HORAS = 5;
  const colombiaTime = new Date(fechaOriginal.getTime() - (OFFSET_COLOMBIA_HORAS * 60 * 60 * 1000));
  
  return colombiaTime;
}

/**
 * Formatea una fecha a string ISO pero en hora colombiana
 * @returns String en formato ISO ajustado a hora colombiana
 */
export function getFechaISO_Colombia(): string {
  return getFechaHoraColombia().toISOString();
}

/**
 * Obtiene fecha en formato para SQLite (YYYY-MM-DD HH:MM:SS) en hora colombiana
 * @returns String en formato compatible con SQLite
 */
export function getFechaSQLite_Colombia(): string {
  const fecha = getFechaHoraColombia();
  return fecha.toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}
