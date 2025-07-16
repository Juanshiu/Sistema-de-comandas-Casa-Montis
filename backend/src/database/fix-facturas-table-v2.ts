import { db } from './init';

// Script mejorado para arreglar la tabla facturas
const fixFacturasTableV2 = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔧 Iniciando corrección de tabla facturas v2...');
      
      // Verificar si la tabla factura_mesas ya existe
      db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='factura_mesas'`, (err, row) => {
        if (err) {
          console.error('❌ Error al verificar tabla factura_mesas:', err);
          return reject(err);
        }
        
        if (!row) {
          // Crear tabla factura_mesas si no existe
          db.run(`
            CREATE TABLE factura_mesas (
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
              console.error('❌ Error al crear tabla factura_mesas:', err);
              return reject(err);
            }
            console.log('✅ Tabla factura_mesas creada');
            continuarProceso();
          });
        } else {
          console.log('✅ Tabla factura_mesas ya existe');
          continuarProceso();
        }
      });
      
      function continuarProceso() {
        // Verificar estructura actual de facturas
        db.get(`PRAGMA table_info(facturas)`, (err, info) => {
          if (err) {
            console.error('❌ Error al obtener info de tabla facturas:', err);
            return reject(err);
          }
          
          // Obtener todas las columnas de facturas
          db.all(`PRAGMA table_info(facturas)`, (err, columns) => {
            if (err) {
              console.error('❌ Error al obtener columnas de facturas:', err);
              return reject(err);
            }
            
            const hasMesaId = columns.some((col: any) => col.name === 'mesa_id');
            
            if (hasMesaId) {
              console.log('🔄 Tabla facturas tiene mesa_id, procediendo a modificar...');
              
              // Crear nueva tabla sin mesa_id
              db.run(`
                CREATE TABLE facturas_temp (
                  id TEXT PRIMARY KEY,
                  comanda_id TEXT NOT NULL,
                  subtotal REAL NOT NULL,
                  total REAL NOT NULL,
                  metodo_pago TEXT NOT NULL,
                  cajero TEXT NOT NULL,
                  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (comanda_id) REFERENCES comandas (id)
                )
              `, (err) => {
                if (err) {
                  console.error('❌ Error al crear tabla facturas_temp:', err);
                  return reject(err);
                }
                
                // Migrar datos (sin mesa_id)
                db.run(`
                  INSERT INTO facturas_temp (id, comanda_id, subtotal, total, metodo_pago, cajero, fecha_creacion)
                  SELECT id, comanda_id, subtotal, total, metodo_pago, cajero, fecha_creacion
                  FROM facturas
                `, (err) => {
                  if (err) {
                    console.error('❌ Error al migrar datos:', err);
                    return reject(err);
                  }
                  
                  // Migrar relaciones mesa_id a factura_mesas
                  db.run(`
                    INSERT OR IGNORE INTO factura_mesas (factura_id, mesa_id)
                    SELECT id, mesa_id FROM facturas WHERE mesa_id IS NOT NULL
                  `, (err) => {
                    if (err) {
                      console.error('❌ Error al migrar relaciones mesa:', err);
                      return reject(err);
                    }
                    
                    // Eliminar tabla antigua
                    db.run(`DROP TABLE facturas`, (err) => {
                      if (err) {
                        console.error('❌ Error al eliminar tabla facturas:', err);
                        return reject(err);
                      }
                      
                      // Renombrar tabla temporal
                      db.run(`ALTER TABLE facturas_temp RENAME TO facturas`, (err) => {
                        if (err) {
                          console.error('❌ Error al renombrar tabla:', err);
                          return reject(err);
                        }
                        
                        console.log('✅ Tabla facturas actualizada correctamente');
                        resolve();
                      });
                    });
                  });
                });
              });
            } else {
              console.log('✅ Tabla facturas ya tiene la estructura correcta');
              resolve();
            }
          });
        });
      }
    });
  });
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixFacturasTableV2()
    .then(() => {
      console.log('✅ Corrección de tabla facturas completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en corrección de tabla facturas:', error);
      process.exit(1);
    });
}

export { fixFacturasTableV2 };
