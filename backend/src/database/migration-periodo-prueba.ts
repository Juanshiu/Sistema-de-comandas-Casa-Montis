import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/casa_montis.db');

export async function ejecutarMigracionPeriodoPrueba() {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.serialize(() => {
      console.log('🔄 Agregando campos de periodo de prueba a tabla empleados...');
      
      // Intentar agregar columnas una por una (si ya existen fallará silenciosamente o manejamos el error)
      db.run(`ALTER TABLE empleados ADD COLUMN es_periodo_prueba BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error agregando es_periodo_prueba:', err.message);
        } else {
          console.log('✅ Columna es_periodo_prueba verificada/agregada');
        }
      });

      db.run(`ALTER TABLE empleados ADD COLUMN fecha_fin_periodo_prueba DATE`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error agregando fecha_fin_periodo_prueba:', err.message);
        } else {
          console.log('✅ Columna fecha_fin_periodo_prueba verificada/agregada');
        }
      });
    });

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Migración de periodo de prueba finalizada');
        resolve();
      }
    });
  });
}

if (require.main === module) {
  ejecutarMigracionPeriodoPrueba()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
