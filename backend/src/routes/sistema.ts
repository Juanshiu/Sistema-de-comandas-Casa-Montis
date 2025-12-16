import { Router } from 'express';
import { db } from '../database/init';

const router = Router();

// Resetear base de datos completa
router.post('/resetear-base-datos', (req, res) => {
  db.serialize(() => {
    // Eliminar todas las tablas
    db.run('DROP TABLE IF EXISTS comandas');
    db.run('DROP TABLE IF EXISTS facturas');
    db.run('DROP TABLE IF EXISTS productos');
    db.run('DROP TABLE IF EXISTS categorias');
    db.run('DROP TABLE IF EXISTS mesas');
    db.run('DROP TABLE IF EXISTS salones');
    db.run('DROP TABLE IF EXISTS personalizaciones_caldos');
    db.run('DROP TABLE IF EXISTS personalizaciones_principios');
    db.run('DROP TABLE IF EXISTS personalizaciones_proteinas');
    db.run('DROP TABLE IF EXISTS personalizaciones_bebidas');
    db.run('DROP TABLE IF EXISTS personalizaciones_ensaladas');
    db.run('DROP TABLE IF EXISTS comanda_mesas');
    db.run('DROP TABLE IF EXISTS comanda_items');

    // Recrear estructura de base de datos
    db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria_id INTEGER,
        disponible INTEGER DEFAULT 1,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS salones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS mesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT NOT NULL,
        capacidad INTEGER DEFAULT 4,
        salon_id INTEGER,
        ocupada INTEGER DEFAULT 0,
        FOREIGN KEY (salon_id) REFERENCES salones(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comandas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        mesero TEXT,
        total REAL,
        estado TEXT DEFAULT 'activa'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comanda_mesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id INTEGER,
        mesa_id INTEGER,
        FOREIGN KEY (comanda_id) REFERENCES comandas(id),
        FOREIGN KEY (mesa_id) REFERENCES mesas(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comanda_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER,
        precio_unitario REAL,
        personalizaciones TEXT,
        FOREIGN KEY (comanda_id) REFERENCES comandas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        mesa_id INTEGER,
        mesero TEXT,
        productos TEXT,
        subtotal REAL,
        iva REAL,
        propina REAL,
        total REAL,
        metodo_pago TEXT,
        FOREIGN KEY (mesa_id) REFERENCES mesas(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS personalizaciones_caldos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio REAL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS personalizaciones_principios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio REAL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS personalizaciones_proteinas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio REAL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS personalizaciones_bebidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio REAL DEFAULT 0
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS personalizaciones_ensaladas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        precio REAL DEFAULT 0
      )
    `, function(err: any) {
      if (err) {
        console.error('Error al resetear base de datos:', err);
        return res.status(500).json({ 
          error: 'Error al resetear base de datos',
          detalles: err.message 
        });
      }

      res.json({ 
        success: true, 
        mensaje: 'Base de datos reseteada exitosamente' 
      });
    });
  });
});

// Liberar todas las mesas
router.post('/liberar-mesas', (req, res) => {
  const query = 'UPDATE mesas SET ocupada = 0';
  
  db.run(query, function(err: any) {
    if (err) {
      console.error('Error al liberar mesas:', err);
      return res.status(500).json({ 
        error: 'Error al liberar mesas',
        detalles: err.message 
      });
    }
    
    res.json({ 
      success: true, 
      mensaje: 'Todas las mesas han sido liberadas',
      mesasLiberadas: this.changes
    });
  });
});

// Limpiar comandas antiguas (más de 30 días)
router.post('/limpiar-comandas-antiguas', (req, res) => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const fechaLimite = hace30Dias.toISOString().split('T')[0];

  // Primero eliminamos comandas antiguas
  const queryComandas = 'DELETE FROM comandas WHERE fecha < ?';
  
  db.run(queryComandas, [fechaLimite], function(errComandas: any) {
    if (errComandas) {
      console.error('Error al limpiar comandas antiguas:', errComandas);
      return res.status(500).json({ 
        error: 'Error al limpiar comandas antiguas',
        detalles: errComandas.message 
      });
    }

    const comandasEliminadas = this.changes;

    // Luego eliminamos facturas antiguas
    const queryFacturas = 'DELETE FROM facturas WHERE fecha < ?';
    
    db.run(queryFacturas, [fechaLimite], function(errFacturas: any) {
      if (errFacturas) {
        console.error('Error al limpiar facturas antiguas:', errFacturas);
        return res.status(500).json({ 
          error: 'Error al limpiar facturas antiguas',
          detalles: errFacturas.message 
        });
      }

      const facturasEliminadas = this.changes;
      const totalEliminadas = comandasEliminadas + facturasEliminadas;

      res.json({ 
        success: true, 
        mensaje: `Se eliminaron ${totalEliminadas} registros antiguos`,
        eliminadas: totalEliminadas,
        comandas: comandasEliminadas,
        facturas: facturasEliminadas
      });
    });
  });
});

export default router;
