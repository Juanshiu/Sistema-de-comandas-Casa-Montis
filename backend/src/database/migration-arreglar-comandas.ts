import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';

export const arreglarEstructuraComandas = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        console.log('🔧 Verificando estructura de tabla comandas...');
        
        // Verificar si la tabla comandas tiene mesa_id
        db.all("PRAGMA table_info(comandas)", (err, columns: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const hasOldMesaId = columns.some(col => col.name === 'mesa_id');
          
          if (hasOldMesaId) {
            console.log('📝 Migrando estructura de comandas...');
            
            // Crear nueva tabla comandas sin mesa_id
            db.run(`
              CREATE TABLE IF NOT EXISTS comandas_new (
                id TEXT PRIMARY KEY,
                mesero TEXT NOT NULL,
                subtotal REAL NOT NULL,
                total REAL NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                observaciones_generales TEXT,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Migrar datos existentes
              db.all("SELECT * FROM comandas", (err, comandas: any[]) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                if (comandas.length === 0) {
                  // No hay datos que migrar, solo renombrar tabla
                  reemplazarTabla(db, resolve, reject);
                  return;
                }
                
                console.log(`🔄 Migrando ${comandas.length} comandas existentes...`);
                
                let migrated = 0;
                let errors = 0;
                
                comandas.forEach((comanda) => {
                  // Insertar en nueva tabla sin mesa_id
                  db.run(`
                    INSERT INTO comandas_new (id, mesero, subtotal, total, estado, observaciones_generales, fecha_creacion, fecha_actualizacion)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    comanda.id,
                    comanda.mesero,
                    comanda.subtotal,
                    comanda.total,
                    comanda.estado,
                    comanda.observaciones_generales,
                    comanda.fecha_creacion,
                    comanda.fecha_actualizacion
                  ], (err) => {
                    if (err) {
                      console.error(`❌ Error migrando comanda ${comanda.id}:`, err);
                      errors++;
                    } else {
                      migrated++;
                      
                      // Si tenía mesa_id, crear relación en comanda_mesas
                      if (comanda.mesa_id) {
                        db.run(`
                          INSERT OR IGNORE INTO comanda_mesas (comanda_id, mesa_id)
                          VALUES (?, ?)
                        `, [comanda.id, comanda.mesa_id], (err) => {
                          if (err) {
                            console.error(`⚠️  Error creando relación mesa para comanda ${comanda.id}:`, err);
                          }
                        });
                      }
                    }
                    
                    // Verificar si terminamos
                    if (migrated + errors === comandas.length) {
                      if (errors > 0) {
                        console.log(`⚠️  Migración completada con ${errors} errores`);
                      } else {
                        console.log('✅ Migración de comandas completada exitosamente');
                      }
                      reemplazarTabla(db, resolve, reject);
                    }
                  });
                });
              });
            });
          } else {
            console.log('✅ La estructura de comandas ya está actualizada');
            db.close();
            resolve();
          }
        });
      });
    });
  });
};

function reemplazarTabla(db: sqlite3.Database, resolve: () => void, reject: (error: any) => void) {
  // Eliminar tabla antigua y renombrar nueva
  db.run("DROP TABLE comandas", (err) => {
    if (err) {
      reject(err);
      return;
    }
    
    db.run("ALTER TABLE comandas_new RENAME TO comandas", (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('✅ Estructura de comandas actualizada exitosamente');
      db.close();
      resolve();
    });
  });
}

// Ejecutar si se llama directamente
if (require.main === module) {
  arreglarEstructuraComandas()
    .then(() => {
      console.log('✅ Migración de estructura completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}
