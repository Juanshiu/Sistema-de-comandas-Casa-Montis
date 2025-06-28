import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';

export const migrarBaseDatos = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        // Verificar si la columna salon existe
        db.all("PRAGMA table_info(mesas)", (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const salonColumnExists = rows.some(row => row.name === 'salon');
          
          if (!salonColumnExists) {
            console.log('Agregando columna salon a la tabla mesas...');
            db.run("ALTER TABLE mesas ADD COLUMN salon TEXT DEFAULT 'Principal'", (err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log('Columna salon agregada exitosamente');
              db.close();
              resolve();
            });
          } else {
            console.log('La columna salon ya existe');
            db.close();
            resolve();
          }
        });
      });
    });
  });
};

// Ejecutar si se llama directamente
if (require.main === module) {
  migrarBaseDatos()
    .then(() => {
      console.log('Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la migración:', error);
      process.exit(1);
    });
}
