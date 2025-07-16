import { db } from './init';

export const crearTablasPersonalizaciones = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de caldos
      db.run(`
        CREATE TABLE IF NOT EXISTS caldos (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL UNIQUE,
          precio_adicional REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tabla caldos:', err);
          reject(err);
          return;
        }
        console.log('Tabla caldos creada/verificada');
      });

      // Tabla de principios
      db.run(`
        CREATE TABLE IF NOT EXISTS principios (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL UNIQUE,
          precio_adicional REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tabla principios:', err);
          reject(err);
          return;
        }
        console.log('Tabla principios creada/verificada');
      });

      // Tabla de proteínas
      db.run(`
        CREATE TABLE IF NOT EXISTS proteinas (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL UNIQUE,
          precio_adicional REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tabla proteinas:', err);
          reject(err);
          return;
        }
        console.log('Tabla proteinas creada/verificada');
      });

      // Tabla de bebidas
      db.run(`
        CREATE TABLE IF NOT EXISTS bebidas (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL UNIQUE,
          precio_adicional REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tabla bebidas:', err);
          reject(err);
          return;
        }
        console.log('Tabla bebidas creada/verificada');
      });

      // Datos iniciales
      const caldosIniciales = [
        { id: 'caldo-pollo', nombre: 'Caldo de Pollo', precio_adicional: 0 },
        { id: 'caldo-res', nombre: 'Caldo de Res', precio_adicional: 0 },
        { id: 'caldo-verduras', nombre: 'Caldo de Verduras', precio_adicional: 0 }
      ];

      const principiosIniciales = [
        { id: 'arroz-blanco', nombre: 'Arroz Blanco', precio_adicional: 0 },
        { id: 'pasta', nombre: 'Pasta', precio_adicional: 0 },
        { id: 'quinoa', nombre: 'Quinoa', precio_adicional: 2000 }
      ];

      const proteinasIniciales = [
        { id: 'pollo', nombre: 'Pollo', precio_adicional: 0 },
        { id: 'res', nombre: 'Res', precio_adicional: 3000 },
        { id: 'cerdo', nombre: 'Cerdo', precio_adicional: 2000 },
        { id: 'pescado', nombre: 'Pescado', precio_adicional: 4000 }
      ];

      const bebidasIniciales = [
        { id: 'agua', nombre: 'Agua', precio_adicional: 0 },
        { id: 'gaseosa', nombre: 'Gaseosa', precio_adicional: 2000 },
        { id: 'jugo', nombre: 'Jugo Natural', precio_adicional: 3000 }
      ];

      // Insertar caldos
      db.get('SELECT COUNT(*) as count FROM caldos', (err, row: any) => {
        if (!err && row.count === 0) {
          const stmt = db.prepare('INSERT INTO caldos (id, nombre, precio_adicional) VALUES (?, ?, ?)');
          caldosIniciales.forEach(caldo => {
            stmt.run([caldo.id, caldo.nombre, caldo.precio_adicional]);
          });
          stmt.finalize();
          console.log('Caldos iniciales insertados');
        }
      });

      // Insertar principios
      db.get('SELECT COUNT(*) as count FROM principios', (err, row: any) => {
        if (!err && row.count === 0) {
          const stmt = db.prepare('INSERT INTO principios (id, nombre, precio_adicional) VALUES (?, ?, ?)');
          principiosIniciales.forEach(principio => {
            stmt.run([principio.id, principio.nombre, principio.precio_adicional]);
          });
          stmt.finalize();
          console.log('Principios iniciales insertados');
        }
      });

      // Insertar proteínas
      db.get('SELECT COUNT(*) as count FROM proteinas', (err, row: any) => {
        if (!err && row.count === 0) {
          const stmt = db.prepare('INSERT INTO proteinas (id, nombre, precio_adicional) VALUES (?, ?, ?)');
          proteinasIniciales.forEach(proteina => {
            stmt.run([proteina.id, proteina.nombre, proteina.precio_adicional]);
          });
          stmt.finalize();
          console.log('Proteínas iniciales insertadas');
        }
      });

      // Insertar bebidas y verificar columna personalizacion
      db.get('SELECT COUNT(*) as count FROM bebidas', (err, row: any) => {
        if (!err && row.count === 0) {
          const stmt = db.prepare('INSERT INTO bebidas (id, nombre, precio_adicional) VALUES (?, ?, ?)');
          bebidasIniciales.forEach(bebida => {
            stmt.run([bebida.id, bebida.nombre, bebida.precio_adicional]);
          });
          stmt.finalize();
          console.log('Bebidas iniciales insertadas');
        }
        
        // Agregar columna personalizacion a comanda_items si no existe
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
                console.log('Columna personalizacion agregada exitosamente');
              }
              resolve();
            });
          } else {
            console.log('Columna personalizacion ya existe en comanda_items');
            resolve();
          }
        });
      });
    });
  });
};
