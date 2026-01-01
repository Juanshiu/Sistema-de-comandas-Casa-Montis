import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/restaurante.db');

export async function ejecutarMigracion() {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.serialize(() => {
      // Crear tabla de configuración de facturación
      db.run(`
        CREATE TABLE IF NOT EXISTS config_facturacion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre_empresa TEXT NOT NULL,
          nit TEXT NOT NULL,
          responsable_iva INTEGER DEFAULT 0,
          porcentaje_iva DECIMAL(5,2),
          direccion TEXT NOT NULL,
          ubicacion_geografica TEXT,
          telefonos TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creando tabla config_facturacion:', err);
          reject(err);
          return;
        }
        console.log('✅ Tabla config_facturacion creada exitosamente');
      });

      // Insertar configuración inicial con datos actuales
      db.run(`
        INSERT INTO config_facturacion (
          nombre_empresa,
          nit,
          responsable_iva,
          porcentaje_iva,
          direccion,
          ubicacion_geografica,
          telefonos
        )
        SELECT 
          'CASA MONTIS RESTAURANTE',
          '26420708-2',
          0,
          NULL,
          'CRA 9 # 11 07 - EDUARDO SANTOS',
          'PALERMO - HUILA',
          '["3132171025", "3224588520"]'
        WHERE NOT EXISTS (SELECT 1 FROM config_facturacion)
      `, (err) => {
        if (err) {
          console.error('❌ Error insertando configuración inicial:', err);
          reject(err);
          return;
        }
        console.log('✅ Configuración inicial insertada exitosamente');
      });
    });

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Migración completada exitosamente');
        resolve();
      }
    });
  });
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarMigracion()
    .then(() => {
      console.log('🎉 Migración de configuración de facturación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}
