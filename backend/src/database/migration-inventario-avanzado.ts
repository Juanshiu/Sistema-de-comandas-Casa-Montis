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

const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
};

export async function migrarInventarioAvanzado(): Promise<void> {
  const migrationName = 'inventario_avanzado_full';

  if (await migrationExists(migrationName)) {
    console.log('✅ Migración de inventario avanzado ya ejecutada');
    return;
  }

  try {
    await runAsync(`
      CREATE TABLE IF NOT EXISTS insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        unidad_medida TEXT NOT NULL,
        stock_actual REAL NOT NULL DEFAULT 0,
        stock_minimo REAL NOT NULL DEFAULT 0,
        stock_critico REAL NOT NULL DEFAULT 0,
        costo_unitario REAL,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS producto_insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        insumo_id INTEGER NOT NULL,
        cantidad_usada REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(producto_id, insumo_id),
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
        FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS personalizacion_insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_personalizacion_id INTEGER NOT NULL,
        insumo_id INTEGER NOT NULL,
        cantidad_ajuste REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_personalizacion_id, insumo_id),
        FOREIGN KEY (item_personalizacion_id) REFERENCES items_personalizacion(id) ON DELETE CASCADE,
        FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS config_sistema (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventario_avanzado INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS insumo_historial (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
        insumo_id INTEGER NOT NULL,
        cantidad REAL NOT NULL,
        unidad_medida TEXT NOT NULL,
        producto_id INTEGER,
        comanda_id TEXT,
        tipo_evento TEXT NOT NULL,
        motivo TEXT,
        usuario_id INTEGER,
        FOREIGN KEY (insumo_id) REFERENCES insumos(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    await runAsync(`
      INSERT INTO config_sistema (inventario_avanzado)
      SELECT 0
      WHERE NOT EXISTS (SELECT 1 FROM config_sistema)
    `);

    const columns = await allAsync('PRAGMA table_info(productos)');
    const tieneUsaInsumos = columns.some(col => col.name === 'usa_insumos');
    if (!tieneUsaInsumos) {
      await runAsync('ALTER TABLE productos ADD COLUMN usa_insumos INTEGER DEFAULT 0');
      console.log('✅ Columna usa_insumos agregada a productos');
    }

    const columnasItems = await allAsync('PRAGMA table_info(items_personalizacion)');
    const tieneUsaInsumosItems = columnasItems.some(col => col.name === 'usa_insumos');
    if (!tieneUsaInsumosItems) {
      await runAsync('ALTER TABLE items_personalizacion ADD COLUMN usa_insumos INTEGER DEFAULT 0');
      console.log('✅ Columna usa_insumos agregada a items_personalizacion');
    }

    const configColumns = await allAsync('PRAGMA table_info(config_sistema)');
    const tieneCriticoModo = configColumns.some(col => col.name === 'critico_modo');
    if (!tieneCriticoModo) {
      await runAsync("ALTER TABLE config_sistema ADD COLUMN critico_modo TEXT DEFAULT 'BLOQUEAR'");
      console.log('✅ Columna critico_modo agregada a config_sistema');
    }

    await markMigrationExecuted(migrationName);
    console.log('✅ Migración de inventario avanzado consolidada completada');
  } catch (error) {
    console.error('❌ Error en migración de inventario avanzado:', error);
    throw error;
  }
}

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  migrarInventarioAvanzado()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
