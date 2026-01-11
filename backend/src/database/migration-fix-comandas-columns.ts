import { db } from './init';

/**
 * Migración para corregir columnas faltantes en tabla comandas
 * - Agrega columna usuario_nombre a comandas si no existe
 */
export const migrarColumnasComandas = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        console.log('🔄 Verificando columnas en tabla comandas...');

        // 1. Agregar columna usuario_nombre a comandas (si no existe)
        await new Promise<void>((res, rej) => {
          db.run(`
            ALTER TABLE comandas ADD COLUMN usuario_nombre TEXT
          `, (err) => {
            // Ignorar error si la columna ya existe
            if (err) {
              if (err.message.includes('duplicate column')) {
                console.log('ℹ️  Columna usuario_nombre ya existe en comandas');
              } else {
                console.error('Error al agregar usuario_nombre a comandas:', err.message);
              }
            } else {
              console.log('✅ Columna usuario_nombre agregada a comandas');
            }
            res();
          });
        });

        // 2. Verificar que usuario_id exista (por seguridad)
        await new Promise<void>((res, rej) => {
          db.run(`
            ALTER TABLE comandas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)
          `, (err) => {
            // Ignorar error si la columna ya existe
            if (err && !err.message.includes('duplicate column')) {
              console.error('Error al agregar usuario_id a comandas:', err.message);
            }
            res();
          });
        });

        console.log('✅ Verificación de columnas de comandas completada');
        resolve();
      } catch (error) {
        console.error('❌ Error en migración de columnas de comandas:', error);
        reject(error);
      }
    });
  });
};
