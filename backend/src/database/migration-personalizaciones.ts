import { db } from './init';

export const crearTablasPersonalizaciones = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de categorías de personalización (sistema dinámico)
      db.run(`
        CREATE TABLE IF NOT EXISTS categorias_personalizacion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          descripcion TEXT,
          activo INTEGER DEFAULT 1,
          orden INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tabla categorias_personalizacion:', err);
          reject(err);
          return;
        }
        console.log('✅ Tabla categorias_personalizacion creada/verificada');
      });

      // Tabla de items de personalización (sistema dinámico)
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
      `, (err) => {
        if (err) {
          console.error('Error creando tabla items_personalizacion:', err);
          reject(err);
          return;
        }
        console.log('✅ Tabla items_personalizacion creada/verificada');
      });

      // Verificar y agregar columna personalizacion a comanda_items si no existe
      db.all("PRAGMA table_info(comanda_items)", (err, columns: any[]) => {
        if (err) {
          console.error('Error verificando estructura de comanda_items:', err);
          resolve();
          return;
        }
        
        const personalizacionColumn = columns.find((col: any) => col.name === 'personalizacion');
        if (!personalizacionColumn) {
          console.log('Agregando columna personalizacion a comanda_items...');
          db.run("ALTER TABLE comanda_items ADD COLUMN personalizacion TEXT", (err) => {
            if (err) {
              console.error('Error agregando columna personalizacion:', err);
            } else {
              console.log('✅ Columna personalizacion agregada exitosamente');
            }
            resolve();
          });
        } else {
          console.log('✅ Columna personalizacion ya existe en comanda_items');
          resolve();
        }
      });
    });
  });
};
