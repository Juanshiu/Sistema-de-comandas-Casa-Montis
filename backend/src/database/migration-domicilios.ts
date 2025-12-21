import sqlite3 from 'sqlite3';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const db = new sqlite3.Database(dbPath);

// Migración para agregar soporte de domicilios
async function migrarDomicilios() {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      console.log('🚀 Iniciando migración de domicilios...');

      // Verificar si la columna tipo_pedido ya existe
      db.all("PRAGMA table_info(comandas)", (err, columns: any[]) => {
        if (err) {
          console.error('❌ Error al verificar estructura:', err);
          reject(err);
          return;
        }

        const tieneTipoPedido = columns.some(col => col.name === 'tipo_pedido');

        if (!tieneTipoPedido) {
          console.log('📝 Agregando campos de domicilio a tabla comandas...');
          
          db.run(`
            ALTER TABLE comandas ADD COLUMN tipo_pedido TEXT DEFAULT 'mesa'
          `, (err) => {
            if (err) {
              console.error('❌ Error al agregar tipo_pedido:', err);
              reject(err);
              return;
            }
            console.log('✅ Campo tipo_pedido agregado');
          });

          db.run(`
            ALTER TABLE comandas ADD COLUMN cliente_nombre TEXT
          `, (err) => {
            if (err) console.error('⚠️  Error al agregar cliente_nombre:', err);
            else console.log('✅ Campo cliente_nombre agregado');
          });

          db.run(`
            ALTER TABLE comandas ADD COLUMN cliente_direccion TEXT
          `, (err) => {
            if (err) console.error('⚠️  Error al agregar cliente_direccion:', err);
            else console.log('✅ Campo cliente_direccion agregado');
          });

          db.run(`
            ALTER TABLE comandas ADD COLUMN cliente_telefono TEXT
          `, (err) => {
            if (err) console.error('⚠️  Error al agregar cliente_telefono:', err);
            else console.log('✅ Campo cliente_telefono agregado');
          });

          db.run(`
            ALTER TABLE comandas ADD COLUMN es_para_llevar BOOLEAN DEFAULT 0
          `, (err) => {
            if (err) {
              console.error('⚠️  Error al agregar es_para_llevar:', err);
            } else {
              console.log('✅ Campo es_para_llevar agregado');
            }
            
            console.log('✅ Migración de domicilios completada');
            resolve();
          });
        } else {
          console.log('ℹ️  Los campos de domicilio ya existen, no se requiere migración');
          resolve();
        }
      });
    });
  });
}

// Ejecutar migración
migrarDomicilios()
  .then(() => {
    console.log('✅ Proceso de migración finalizado');
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en la migración:', error);
    db.close();
    process.exit(1);
  });
