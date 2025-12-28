/**
 * Utilidades compartidas para el manejo de personalizaciones y categorías
 */

/**
 * Obtiene el icono asociado a una categoría de personalización según su nombre
 * @param nombreCategoria - Nombre de la categoría
 * @returns Emoji representativo
 */
export const getIconoCategoria = (nombreCategoria: string): string => {
  const nombre = nombreCategoria.toLowerCase();
  if (nombre.includes('caldo') || nombre.includes('sopa')) return '🍲';
  if (nombre.includes('principio') || nombre.includes('guarnición')) return '🥗';
  if (nombre.includes('proteína') || nombre.includes('proteina') || nombre.includes('carne')) return '🍖';
  if (nombre.includes('bebida') || nombre.includes('jugo') || nombre.includes('refresco')) return '🥤';
  if (nombre.includes('salsa')) return '🥫';
  if (nombre.includes('postre')) return '🍰';
  if (nombre.includes('entrada')) return '🍴';
  if (nombre.includes('acompañamiento')) return '🍚';
  return '🔹'; // Icono por defecto
};

/**
 * Obtiene el icono apropiado según el nombre de la categoría/tipo de servicio de productos
 * @param nombre - Nombre de la categoría
 * @returns Emoji representativo
 */
export const getIconoPorCategoria = (nombre: string): string => {
  const nombreLower = nombre.toLowerCase();
  
  if (nombreLower.includes('desayuno')) return '🌅';
  if (nombreLower.includes('almuerzo')) return '🍽️';
  if (nombreLower.includes('pechuga') || nombreLower.includes('pollo')) return '🍗';
  if (nombreLower.includes('carne') || nombreLower.includes('res')) return '🥩';
  if (nombreLower.includes('pasta')) return '🍝';
  if (nombreLower.includes('pescado') || nombreLower.includes('mariscos')) return '🐟';
  if (nombreLower.includes('arroz')) return '🍚';
  if (nombreLower.includes('sopa') || nombreLower.includes('caldo')) return '🍲';
  if (nombreLower.includes('bebida') || nombreLower.includes('jugo')) return '🥤';
  if (nombreLower.includes('cafeteria') || nombreLower.includes('café') || nombreLower.includes('postre')) return '☕';
  if (nombreLower.includes('porcion') || nombreLower.includes('adicional')) return '🍽️';
  if (nombreLower.includes('otro') || nombreLower.includes('desechable')) return '📦';
  
  return '🍴'; // Icono por defecto
};

/**
 * Obtiene la personalización de una categoría específica de manera dinámica
 * @param personalizacion - Objeto con las personalizaciones
 * @param nombreCategoria - Nombre de la categoría a buscar
 * @returns La personalización encontrada o null
 */
export const getPersonalizacionPorCategoria = (personalizacion: any, nombreCategoria: string): any => {
  if (!personalizacion) return null;
  
  // Convertir el nombre de la categoría a la clave utilizada
  const clave = nombreCategoria.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
  
  // Buscar directamente por la clave generada
  return personalizacion[clave] || null;
};
