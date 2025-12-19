import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(__dirname, '../../database/casa_montis.db'));

console.log('🔄 Iniciando migración para items de personalización dinámicos...');

db.serialize(() => {
  try {
    db.run('BEGIN TRANSACTION');

    // Crear tabla genérica para items de personalización de cualquier categoría
    console.log('📋 Creando tabla items_personalizacion...');
    db.run(`
      CREATE TABLE IF NOT EXISTS items_personalizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio_adicional INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias_personalizacion(id) ON DELETE CASCADE,
        UNIQUE(categoria_id, nombre)
      )
    `, (err) => {
      if (err) {
        console.error('Error al crear tabla:', err);
        db.run('ROLLBACK');
        return;
      }
      
      // Migrar datos existentes de las 4 tablas originales a la tabla genérica
      // Las tablas viejas tienen: id, nombre, precio_adicional, activo (sin descripcion)
      console.log('🔄 Migrando datos de caldos...');
      db.get(`
        SELECT id FROM categorias_personalizacion WHERE nombre LIKE '%caldo%' OR nombre LIKE '%sopa%' LIMIT 1
      `, (err: any, categoriaCaldoId: any) => {
        if (err) {
          console.error('Error al buscar categoría caldo:', err);
        } else if (categoriaCaldoId) {
          db.run(`
            INSERT OR IGNORE INTO items_personalizacion (categoria_id, nombre, precio_adicional)
            SELECT ${categoriaCaldoId.id}, nombre, precio_adicional
            FROM caldos
          `);
          console.log('✅ Datos de caldos migrados');
        }
      });

      console.log('🔄 Migrando datos de principios...');
      db.get(`
        SELECT id FROM categorias_personalizacion WHERE nombre LIKE '%principio%' LIMIT 1
      `, (err: any, categoriaPrincipioId: any) => {
        if (err) {
          console.error('Error al buscar categoría principio:', err);
        } else if (categoriaPrincipioId) {
          db.run(`
            INSERT OR IGNORE INTO items_personalizacion (categoria_id, nombre, precio_adicional)
            SELECT ${categoriaPrincipioId.id}, nombre, precio_adicional
            FROM principios
          `);
          console.log('✅ Datos de principios migrados');
        }
      });

      console.log('🔄 Migrando datos de proteinas...');
      db.get(`
        SELECT id FROM categorias_personalizacion WHERE nombre LIKE '%prote%' LIMIT 1
      `, (err: any, categoriaProteinaId: any) => {
        if (err) {
          console.error('Error al buscar categoría proteína:', err);
        } else if (categoriaProteinaId) {
          db.run(`
            INSERT OR IGNORE INTO items_personalizacion (categoria_id, nombre, precio_adicional)
            SELECT ${categoriaProteinaId.id}, nombre, precio_adicional
            FROM proteinas
          `);
          console.log('✅ Datos de proteínas migrados');
        }
      });

      console.log('🔄 Migrando datos de bebidas...');
      db.get(`
        SELECT id FROM categorias_personalizacion WHERE nombre LIKE '%bebida%' LIMIT 1
      `, (err: any, categoriaBebidaId: any) => {
        if (err) {
          console.error('Error al buscar categoría bebida:', err);
        } else if (categoriaBebidaId) {
          db.run(`
            INSERT OR IGNORE INTO items_personalizacion (categoria_id, nombre, precio_adicional)
            SELECT ${categoriaBebidaId.id}, nombre, precio_adicional
            FROM bebidas
          `);
          console.log('✅ Datos de bebidas migrados');
        }
      });

      // Crear índices para mejor rendimiento
      console.log('📊 Creando índices...');
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_items_personalizacion_categoria 
        ON items_personalizacion(categoria_id)
      `);
      
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_items_personalizacion_activo 
        ON items_personalizacion(activo)
      `);

      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error al hacer commit:', err);
          db.run('ROLLBACK');
        } else {
          console.log('✅ Migración completada exitosamente');
          console.log('📝 Nota: Las tablas originales (caldos, principios, proteinas, bebidas) se mantienen por compatibilidad');
          console.log('📝 Puedes eliminarlas manualmente si ya no las necesitas');
        }
        db.close();
      });
    });

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    db.run('ROLLBACK');
    db.close();
  }
});
