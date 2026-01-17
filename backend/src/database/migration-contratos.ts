import { db } from './init';

/**
 * Migración para crear la tabla de contratos y su historial
 */
export const migrarContratos = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Iniciando migración de contratos...');

      db.run(`
        CREATE TABLE IF NOT EXISTS contratos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empleado_id INTEGER NOT NULL,
          tipo_contrato TEXT NOT NULL,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE,
          duracion_contrato TEXT,
          cargo TEXT,
          salario REAL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          contrato_details TEXT, -- JSON con todos los detalles adicionales
          usuario_id INTEGER,
          usuario_nombre TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error en migración de contratos:', err);
          reject(err);
        } else {
          console.log('✅ Tabla contratos verificada/creada');
          resolve();
        }
      });
    });
  });
};
