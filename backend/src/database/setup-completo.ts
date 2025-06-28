import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { importarProductos } from './import-productos';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const dbDir = path.dirname(dbPath);

// Crear directorio de base de datos si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const setupCompleto = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(async () => {
        try {
          // Poblar mesas iniciales por salones
          const mesasIniciales = [
            // Salón Principal (9 mesas)
            { numero: '1', capacidad: 6, salon: 'Principal' },
            { numero: '2', capacidad: 6, salon: 'Principal' },
            { numero: '3', capacidad: 6, salon: 'Principal' },
            { numero: '4', capacidad: 6, salon: 'Principal' },
            { numero: '5', capacidad: 6, salon: 'Principal' },
            { numero: '6', capacidad: 6, salon: 'Principal' },
            { numero: '7', capacidad: 4, salon: 'Principal' },
            { numero: '8', capacidad: 4, salon: 'Principal' },
            { numero: '9', capacidad: 6, salon: 'Principal' },
            
            // Salón 1 (4 mesas)
            { numero: '1-1', capacidad: 4, salon: 'Salón 1' },
            { numero: '1-2', capacidad: 2, salon: 'Salón 1' },
            { numero: '1-3', capacidad: 6, salon: 'Salón 1' },
            { numero: '1-4', capacidad: 4, salon: 'Salón 1' },
            
            // Salón 2 (4 mesas)
            { numero: '2-1', capacidad: 4, salon: 'Salón 2' },
            { numero: '2-2', capacidad: 2, salon: 'Salón 2' },
            { numero: '2-3', capacidad: 6, salon: 'Salón 2' },
            { numero: '2-4', capacidad: 4, salon: 'Salón 2' },
            
            // Salón 3 (5 mesas)
            { numero: '3-1', capacidad: 4, salon: 'Salón 3' },
            { numero: '3-2', capacidad: 2, salon: 'Salón 3' },
            { numero: '3-3', capacidad: 6, salon: 'Salón 3' },
            { numero: '3-4', capacidad: 4, salon: 'Salón 3' },
            { numero: '3-5', capacidad: 8, salon: 'Salón 3' },
            
            // Salón 4 (1 mesa)
            { numero: '4-1', capacidad: 12, salon: 'Salón 4' },
            
            // Salón 5 (1 mesa)
            { numero: '5-1', capacidad: 10, salon: 'Salón 5' }
          ];

          // Limpiar mesas existentes
          db.run('DELETE FROM mesas', (err) => {
            if (err) {
              reject(err);
              return;
            }

            console.log('Tabla de mesas limpiada');

            // Insertar mesas
            const stmt = db.prepare('INSERT INTO mesas (numero, capacidad, salon, ocupada) VALUES (?, ?, ?, 0)');
            
            mesasIniciales.forEach((mesa, index) => {
              stmt.run([mesa.numero, mesa.capacidad, mesa.salon], (err) => {
                if (err) {
                  console.error(`Error al insertar mesa ${mesa.numero}:`, err);
                }
              });

              // Si es la última mesa, finalizar e importar productos
              if (index === mesasIniciales.length - 1) {
                stmt.finalize(async (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  console.log(`${mesasIniciales.length} mesas insertadas correctamente`);
                  
                  // Cerrar conexión antes de importar productos
                  db.close(async (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    try {
                      // Importar productos
                      await importarProductos();
                      console.log('Setup completo finalizado exitosamente');
                      resolve();
                    } catch (error) {
                      reject(error);
                    }
                  });
                });
              }
            });
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  });
};

// Ejecutar si se llama directamente
if (require.main === module) {
  setupCompleto()
    .then(() => {
      console.log('Setup completo ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en setup completo:', error);
      process.exit(1);
    });
}
