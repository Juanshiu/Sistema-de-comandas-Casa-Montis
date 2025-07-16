import { db } from './init';

// Script para arreglar la tabla facturas removiendo el campo mesa_id obligatorio
const fixFacturasTable = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔧 Iniciando corrección de tabla facturas...');
      
      // Primero, crear la tabla nueva sin mesa_id obligatorio
      db.run(`
        CREATE TABLE IF NOT EXISTS facturas_new (
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
          console.error('❌ Error al crear tabla facturas_new:', err);
          return reject(err);
        }
        console.log('✅ Tabla facturas_new creada');
      });

      // Crear tabla para relacionar facturas con mesas
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
          console.error('❌ Error al crear tabla factura_mesas:', err);
          return reject(err);
        }
        console.log('✅ Tabla factura_mesas creada');
      });

      // Migrar datos existentes (si los hay)
      db.all(`SELECT * FROM facturas`, (err, rows) => {
        if (err) {
          console.error('❌ Error al obtener facturas existentes:', err);
          return reject(err);
        }

        if (rows && rows.length > 0) {
          console.log(`📋 Migrando ${rows.length} facturas existentes...`);
          
          let migradas = 0;
          
          rows.forEach((factura: any) => {
            // Insertar en la nueva tabla sin mesa_id
            db.run(`
              INSERT INTO facturas_new (
                id, comanda_id, subtotal, total, 
                metodo_pago, cajero, fecha_creacion
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              factura.id,
              factura.comanda_id,
              factura.subtotal,
              factura.total,
              factura.metodo_pago,
              factura.cajero,
              factura.fecha_creacion
            ], (err) => {
              if (err) {
                console.error('❌ Error al migrar factura:', err);
              } else {
                migradas++;
                
                // Si tenía mesa_id, crear la relación
                if (factura.mesa_id) {
                  db.run(`
                    INSERT INTO factura_mesas (factura_id, mesa_id)
                    VALUES (?, ?)
                  `, [factura.id, factura.mesa_id], (err) => {
                    if (err) {
                      console.error('❌ Error al crear relación factura-mesa:', err);
                    }
                  });
                }
              }
              
              if (migradas === rows.length) {
                completarMigracion();
              }
            });
          });
        } else {
          console.log('📋 No hay facturas existentes para migrar');
          completarMigracion();
        }
      });

      function completarMigracion() {
        // Eliminar tabla antigua
        db.run(`DROP TABLE IF EXISTS facturas`, (err) => {
          if (err) {
            console.error('❌ Error al eliminar tabla facturas antigua:', err);
            return reject(err);
          }
          console.log('✅ Tabla facturas antigua eliminada');
        });

        // Renombrar tabla nueva
        db.run(`ALTER TABLE facturas_new RENAME TO facturas`, (err) => {
          if (err) {
            console.error('❌ Error al renombrar tabla facturas_new:', err);
            return reject(err);
          }
          console.log('✅ Tabla facturas actualizada correctamente');
          resolve();
        });
      }
    });
  });
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  fixFacturasTable()
    .then(() => {
      console.log('✅ Corrección de tabla facturas completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en corrección de tabla facturas:', error);
      process.exit(1);
    });
}

export { fixFacturasTable };
