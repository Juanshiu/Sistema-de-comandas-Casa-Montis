import { db } from './init';
import { migrationExists, markMigrationExecuted } from './migration-control';

const runAsync = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

export async function migrarProveedores(): Promise<void> {
  const migrationName = 'proveedores_v2';

  if (await migrationExists(migrationName)) {
    console.log('✅ Migración de proveedores ya ejecutada');
    return;
  }

  try {
    // Tabla de proveedores
    await runAsync(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        documento TEXT UNIQUE,
        telefono TEXT,
        correo TEXT,
        direccion TEXT,
        descripcion TEXT,
        pais TEXT,
        departamento TEXT,
        ciudad TEXT,
        banco_nombre TEXT,
        banco_tipo_cuenta TEXT,
        banco_titular TEXT,
        banco_nit_titular TEXT,
        banco_numero_cuenta TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Añadir columna proveedor_id a insumo_historial si no existe
    try {
      await runAsync('ALTER TABLE insumo_historial ADD COLUMN proveedor_id INTEGER');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        // Ignorar si la columna ya existe
      } else {
        console.warn('Nota: La columna proveedor_id ya existe o hubo un error manejable:', e.message);
      }
    }

    // Añadir columna direccion a proveedores si no existe (para instalaciones existentes)
    try {
      await runAsync('ALTER TABLE proveedores ADD COLUMN direccion TEXT');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.warn('Nota: La columna direccion ya existe o hubo un error manejable:', e.message);
      }
    }

    // Añadir columna descripcion a proveedores si no existe
    try {
      await runAsync('ALTER TABLE proveedores ADD COLUMN descripcion TEXT');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.warn('Nota: La columna descripcion ya existe o hubo un error manejable:', e.message);
      }
    }

    await markMigrationExecuted(migrationName);
    console.log('✅ Migración de proveedores completada');
  } catch (error) {
    console.error('❌ Error en migración de proveedores:', error);
    throw error;
  }
}
