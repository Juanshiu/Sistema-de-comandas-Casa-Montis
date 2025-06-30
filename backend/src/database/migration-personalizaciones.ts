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
        
        // Insertar datos iniciales solo si las tablas están vacías
        insertarDatosIniciales();
        resolve();
      });
    });
  });
};

const insertarDatosIniciales = () => {
  // Datos iniciales para caldos
  const caldosIniciales = [
    { id: 'caldo_pollo', nombre: 'Caldo de Pollo', precio_adicional: 0 },
    { id: 'caldo_costilla', nombre: 'Caldo de Costilla', precio_adicional: 2000 },
    { id: 'sancocho', nombre: 'Sancocho', precio_adicional: 3000 },
    { id: 'sopa_verduras', nombre: 'Sopa de Verduras', precio_adicional: 0 }
  ];

  // Datos iniciales para principios
  const principiosIniciales = [
    { id: 'arroz_blanco', nombre: 'Arroz Blanco', precio_adicional: 0 },
    { id: 'arroz_frijol', nombre: 'Arroz con Fríjol', precio_adicional: 1000 },
    { id: 'pasta', nombre: 'Pasta', precio_adicional: 1500 },
    { id: 'papa_criolla', nombre: 'Papa Criolla', precio_adicional: 2000 },
    { id: 'yuca', nombre: 'Yuca', precio_adicional: 1000 }
  ];

  // Datos iniciales para proteínas
  const proteinasIniciales = [
    { id: 'pollo_asado', nombre: 'Pollo Asado', precio_adicional: 0 },
    { id: 'carne_desmechada', nombre: 'Carne Desmechada', precio_adicional: 2000 },
    { id: 'cerdo', nombre: 'Cerdo', precio_adicional: 3000 },
    { id: 'pescado', nombre: 'Pescado', precio_adicional: 4000 },
    { id: 'huevo', nombre: 'Huevo', precio_adicional: 1000 }
  ];

  // Datos iniciales para bebidas
  const bebidasIniciales = [
    { id: 'jugo_natural', nombre: 'Jugo Natural', precio_adicional: 0 },
    { id: 'gaseosa', nombre: 'Gaseosa', precio_adicional: 1000 },
    { id: 'agua', nombre: 'Agua', precio_adicional: 500 },
    { id: 'limonada', nombre: 'Limonada', precio_adicional: 2000 }
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

  // Insertar bebidas
  db.get('SELECT COUNT(*) as count FROM bebidas', (err, row: any) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO bebidas (id, nombre, precio_adicional) VALUES (?, ?, ?)');
      bebidasIniciales.forEach(bebida => {
        stmt.run([bebida.id, bebida.nombre, bebida.precio_adicional]);
      });
      stmt.finalize();
      console.log('Bebidas iniciales insertadas');
    }
  });
};

// Ejecutar si se llama directamente
if (require.main === module) {
  crearTablasPersonalizaciones()
    .then(() => {
      console.log('Tablas de personalizaciones creadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error creando tablas de personalizaciones:', error);
      process.exit(1);
    });
}
