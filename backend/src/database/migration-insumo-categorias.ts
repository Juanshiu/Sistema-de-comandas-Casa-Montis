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

export async function migrarInsumoCategorias(): Promise<void> {
  const migrationName = 'insumo_categorias_v1';

  if (await migrationExists(migrationName)) {
    console.log('✅ Migración de categorías de insumos ya ejecutada');
    return;
  }

  try {
    // Tabla de categorías de insumos
    await runAsync(`
      CREATE TABLE IF NOT EXISTS insumo_categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Añadir columna categoria_id a la tabla insumos
    try {
      await runAsync('ALTER TABLE insumos ADD COLUMN categoria_id INTEGER');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.warn('Nota: La columna categoria_id ya existe o hubo un error manejable:', e.message);
      }
    }

    await markMigrationExecuted(migrationName);
    console.log('✅ Migración de categorías de insumos completada');
  } catch (error) {
    console.error('❌ Error en migración de categorías de insumos:', error);
    throw error;
  }
}
