import { db } from './init';

/**
 * Migración para agregar campos de personalización a productos
 * y asegurar tabla de categorías de personalización
 */
export const migrarPersonalizacionesProductos = () => {
  console.log('Iniciando migración de personalizaciones en productos...');

  db.serialize(() => {
    // Agregar campos de personalización a la tabla productos
    db.run(`
      ALTER TABLE productos ADD COLUMN tiene_personalizacion INTEGER DEFAULT 0
    `, (err: any) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar tiene_personalizacion:', err);
      }
    });

    db.run(`
      ALTER TABLE productos ADD COLUMN personalizaciones_habilitadas TEXT
    `, (err: any) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar personalizaciones_habilitadas:', err);
      }
    });

    // Crear tabla de categorías de personalización si no existe
    db.run(`
      CREATE TABLE IF NOT EXISTS categorias_personalizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        orden INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err: any) => {
      if (err) {
        console.error('Error al crear tabla categorias_personalizacion:', err);
        return;
      }

      // Insertar categorías por defecto si no existen
      const categoriasDefault = [
        { nombre: 'Caldos/Sopas', descripcion: 'Opciones de caldos y sopas', orden: 1 },
        { nombre: 'Principios', descripcion: 'Opciones de principios', orden: 2 },
        { nombre: 'Proteínas', descripcion: 'Opciones de proteínas', orden: 3 },
        { nombre: 'Bebidas', descripcion: 'Opciones de bebidas', orden: 4 }
      ];

      categoriasDefault.forEach(cat => {
        db.run(
          'INSERT OR IGNORE INTO categorias_personalizacion (nombre, descripcion, orden) VALUES (?, ?, ?)',
          [cat.nombre, cat.descripcion, cat.orden]
        );
      });
    });

    // Crear tabla de items de personalización si no existe
    db.run(`
      CREATE TABLE IF NOT EXISTS items_personalizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio_adicional REAL DEFAULT 0,
        activo INTEGER DEFAULT 1,
        disponible INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias_personalizacion(id) ON DELETE CASCADE
      )
    `, (err: any) => {
      if (err) {
        console.error('Error al crear tabla items_personalizacion:', err);
      }
    });

    console.log('✅ Migración de personalizaciones completada');
  });
};

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  migrarPersonalizacionesProductos();
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}
