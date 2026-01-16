import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/casa_montis.db');

export async function ejecutarMigracionLiquidacionAudit() {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.serialize(() => {
      // Crear tabla de historial de liquidaciones
      db.run(`
        CREATE TABLE IF NOT EXISTS historial_liquidaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empleado_id INTEGER NOT NULL,
          fecha_liquidacion TEXT NOT NULL,
          fecha_inicio_contrato TEXT NOT NULL,
          fecha_fin_contrato TEXT NOT NULL,
          tipo_contrato TEXT NOT NULL,
          tipo_terminacion TEXT NOT NULL,
          salario_fijo INTEGER DEFAULT 1,
          base_calculo REAL NOT NULL,
          base_calculo_detalle TEXT, -- JSON
          dias_laborados INTEGER NOT NULL,
          cesantias REAL NOT NULL,
          intereses_cesantias REAL NOT NULL,
          prima_servicios REAL NOT NULL,
          vacaciones REAL NOT NULL,
          indemnizacion REAL DEFAULT 0,
          total_liquidacion REAL NOT NULL,
          usuario_genero TEXT,
          version_normativa TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creando tabla historial_liquidaciones:', err);
        } else {
          console.log('✅ Tabla historial_liquidaciones creada o ya existente.');
        }
      });
    });

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Migración de auditoría de liquidación completada');
        resolve();
      }
    });
  });
}

if (require.main === module) {
  ejecutarMigracionLiquidacionAudit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
