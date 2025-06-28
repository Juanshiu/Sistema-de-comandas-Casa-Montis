import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';

export const migrarMultiplesMesas = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        // Crear tabla de relación comandas-mesas
        db.run(`
          CREATE TABLE IF NOT EXISTS comanda_mesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comanda_id TEXT NOT NULL,
            mesa_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (comanda_id) REFERENCES comandas (id) ON DELETE CASCADE,
            FOREIGN KEY (mesa_id) REFERENCES mesas (id),
            UNIQUE(comanda_id, mesa_id)
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Tabla comanda_mesas creada exitosamente');
          
          // Verificar si necesitamos migrar datos existentes
          db.get("SELECT COUNT(*) as count FROM comandas", (err, row: any) => {
            if (err) {
              reject(err);
              return;
            }
            
            if (row.count > 0) {
              console.log(`Migrando ${row.count} comandas existentes...`);
              
              // Migrar comandas existentes
              db.all("SELECT id, mesa_id FROM comandas WHERE mesa_id IS NOT NULL", (err, comandas: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                if (comandas.length === 0) {
                  console.log('No hay comandas con mesa_id para migrar');
                  db.close();
                  resolve();
                  return;
                }
                
                const stmt = db.prepare("INSERT OR IGNORE INTO comanda_mesas (comanda_id, mesa_id) VALUES (?, ?)");
                let migrated = 0;
                
                comandas.forEach((comanda, index) => {
                  stmt.run([comanda.id, comanda.mesa_id], (err) => {
                    if (err) {
                      console.error(`Error migrando comanda ${comanda.id}:`, err);
                    } else {
                      migrated++;
                    }
                    
                    if (index === comandas.length - 1) {
                      stmt.finalize(() => {
                        console.log(`${migrated} comandas migradas exitosamente`);
                        db.close();
                        resolve();
                      });
                    }
                  });
                });
              });
            } else {
              console.log('No hay comandas existentes para migrar');
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
  migrarMultiplesMesas()
    .then(() => {
      console.log('Migración de múltiples mesas completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la migración de múltiples mesas:', error);
      process.exit(1);
    });
}
