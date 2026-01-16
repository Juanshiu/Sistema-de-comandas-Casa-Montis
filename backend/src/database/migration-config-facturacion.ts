import { db } from './init';
import { migrationExists, markMigrationExecuted } from './migration-control';

export async function ejecutarMigracionConfigFacturacion() {
  const migrationName = 'config_facturacion_v1';
  
  if (await migrationExists(migrationName)) {
    // Si ya existe, de todas formas nos aseguramos que la tabla tenga todos los campos
    // pero no intentamos re-insertar datos iniciales si ya hay algo
    return new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        // Asegurar que la tabla existe (por si acaso)
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
            representante_legal TEXT,
            tipo_identificacion TEXT,
            departamento TEXT,
            ciudad TEXT,
            telefono2 TEXT,
            correo_electronico TEXT,
            responsabilidad_tributaria TEXT,
            tributos TEXT,
            zona TEXT,
            sitio_web TEXT,
            alias TEXT,
            actividad_economica TEXT,
            descripcion TEXT,
            logo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Crear tabla de configuración de facturación con todos los campos (base + extendidos)
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
          representante_legal TEXT,
          tipo_identificacion TEXT,
          departamento TEXT,
          ciudad TEXT,
          telefono2 TEXT,
          correo_electronico TEXT,
          responsabilidad_tributaria TEXT,
          tributos TEXT,
          zona TEXT,
          sitio_web TEXT,
          alias TEXT,
          actividad_economica TEXT,
          descripcion TEXT,
          logo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, async (err) => {
        if (err) {
          console.error('❌ Error creando tabla config_facturacion:', err);
          reject(err);
          return;
        }
        
        console.log('✅ Tabla config_facturacion creada/verificada');

        // Insertar configuración inicial con datos actuales si no existe
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
        `, async (err) => {
          if (err) {
            console.error('❌ Error insertando configuración inicial:', err);
            reject(err);
            return;
          }
          
          await markMigrationExecuted(migrationName);
          console.log('✅ Configuración inicial verificada y migración marcada');
          resolve();
        });
      });
    });
  });
}
