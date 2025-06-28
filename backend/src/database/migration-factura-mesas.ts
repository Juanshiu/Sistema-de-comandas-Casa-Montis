import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';

export const migrarFacturaMesas = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        // Crear tabla de relación facturas-mesas
        db.run(`
          CREATE TABLE IF NOT EXISTS factura_mesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            factura_id TEXT NOT NULL,
            mesa_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (factura_id) REFERENCES facturas (id) ON DELETE CASCADE,
            FOREIGN KEY (mesa_id) REFERENCES mesas (id),
            UNIQUE(factura_id, mesa_id)
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Tabla factura_mesas creada exitosamente');
          
          // Verificar si la columna mesa_id existe en facturas y migrar datos
          db.all("PRAGMA table_info(facturas)", (err, columns: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            
            const mesaIdColumnExists = columns.some(col => col.name === 'mesa_id');
            
            if (mesaIdColumnExists) {
              console.log('Migrando facturas existentes...');
              
              db.all("SELECT id, mesa_id FROM facturas WHERE mesa_id IS NOT NULL", (err, facturas: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                if (facturas.length === 0) {
                  console.log('No hay facturas con mesa_id para migrar');
                  db.close();
                  resolve();
                  return;
                }
                
                const stmt = db.prepare("INSERT OR IGNORE INTO factura_mesas (factura_id, mesa_id) VALUES (?, ?)");
                let migrated = 0;
                
                facturas.forEach((factura, index) => {
                  stmt.run([factura.id, factura.mesa_id], (err) => {
                    if (err) {
                      console.error(`Error migrando factura ${factura.id}:`, err);
                    } else {
                      migrated++;
                    }
                    
                    if (index === facturas.length - 1) {
                      stmt.finalize(() => {
                        console.log(`${migrated} facturas migradas exitosamente`);
                        db.close();
                        resolve();
                      });
                    }
                  });
                });
              });
            } else {
              console.log('No hay columna mesa_id en facturas para migrar');
              db.close();
              resolve();
            }
          });
        });
      });
    });
  });
};

// Ejecutar si se llama directamente
if (require.main === module) {
  migrarFacturaMesas()
    .then(() => {
      console.log('Migración de factura-mesas completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la migración de factura-mesas:', error);
      process.exit(1);
    });
}
