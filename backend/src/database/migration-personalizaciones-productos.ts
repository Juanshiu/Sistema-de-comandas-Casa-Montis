import { db } from './init';

/**
 * Migración para agregar campos de personalización a productos
 * y crear tabla de categorías de personalización
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

    // Crear tabla de categorías de personalización
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

    // Agregar campo categoria_id a las tablas de personalizaciones existentes
    const tablasPersonalizacion = [
      'caldos',
      'principios', 
      'proteinas',
      'bebidas'
    ];

    tablasPersonalizacion.forEach(tabla => {
      db.run(`
        ALTER TABLE ${tabla} ADD COLUMN categoria_id INTEGER
      `, (err: any) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`Error al agregar categoria_id a ${tabla}:`, err);
        }
      });
    });

    // Actualizar categoria_id para las personalizaciones existentes
    db.run(`UPDATE caldos SET categoria_id = (SELECT id FROM categorias_personalizacion WHERE nombre = 'Caldos/Sopas')`);
    db.run(`UPDATE principios SET categoria_id = (SELECT id FROM categorias_personalizacion WHERE nombre = 'Principios')`);
    db.run(`UPDATE proteinas SET categoria_id = (SELECT id FROM categorias_personalizacion WHERE nombre = 'Proteínas')`);
    db.run(`UPDATE bebidas SET categoria_id = (SELECT id FROM categorias_personalizacion WHERE nombre = 'Bebidas')`);

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
