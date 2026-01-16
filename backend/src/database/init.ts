import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const dbDir = path.dirname(dbPath);

// Crear directorio de base de datos si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

export const initDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla Mesas
      db.run(`
        CREATE TABLE IF NOT EXISTS mesas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL UNIQUE,
          capacidad INTEGER NOT NULL,
          salon TEXT DEFAULT 'Principal',
          ocupada BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla Productos
      db.run(`
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio REAL NOT NULL,
          categoria TEXT NOT NULL,
          disponible BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla Comandas (estructura actualizada - sin mesa_id)
      db.run(`
        CREATE TABLE IF NOT EXISTS comandas (
          id TEXT PRIMARY KEY,
          mesero TEXT NOT NULL,
          subtotal REAL NOT NULL,
          total REAL NOT NULL,
          estado TEXT DEFAULT 'pendiente',
          observaciones_generales TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de relación Comandas-Mesas
      db.run(`
        CREATE TABLE IF NOT EXISTS comanda_mesas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          comanda_id TEXT NOT NULL,
          mesa_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (comanda_id) REFERENCES comandas (id) ON DELETE CASCADE,
          FOREIGN KEY (mesa_id) REFERENCES mesas (id),
          UNIQUE(comanda_id, mesa_id)
        )
      `);

      // Tabla Items de Comanda
      db.run(`
        CREATE TABLE IF NOT EXISTS comanda_items (
          id TEXT PRIMARY KEY,
          comanda_id TEXT NOT NULL,
          producto_id INTEGER NOT NULL,
          cantidad INTEGER NOT NULL,
          precio_unitario REAL NOT NULL,
          subtotal REAL NOT NULL,
          observaciones TEXT,
          personalizacion TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (comanda_id) REFERENCES comandas (id) ON DELETE CASCADE,
          FOREIGN KEY (producto_id) REFERENCES productos (id)
        )
      `);

      // Tabla Facturas
      db.run(`
        CREATE TABLE IF NOT EXISTS facturas (
          id TEXT PRIMARY KEY,
          comanda_id TEXT NOT NULL,
          mesa_id INTEGER NOT NULL,
          subtotal REAL NOT NULL,
          total REAL NOT NULL,
          metodo_pago TEXT NOT NULL,
          cajero TEXT NOT NULL,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (comanda_id) REFERENCES comandas (id),
          FOREIGN KEY (mesa_id) REFERENCES mesas (id)
        )
      `);

      // Tabla Configuración de Facturación (Datos de la Empresa)
      db.run(`
        CREATE TABLE IF NOT EXISTS config_facturacion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre_empresa TEXT NOT NULL,
          nit TEXT NOT NULL,
          responsable_iva INTEGER DEFAULT 0,
          porcentaje_iva DECIMAL(5,2),
          direccion TEXT NOT NULL,
          ubicacion_geografica TEXT,
          telefonos TEXT NOT NULL,
          representante_legal TEXT,
          tipo_identificacion TEXT,
          departamento TEXT,
          ciudad TEXT,
          telefono2 TEXT,
          correo_electronico TEXT,
          responsabilidad_tributaria TEXT,
          tributos TEXT,
          zona TEXT,
          sitio_web TEXT,
          alias TEXT,
          actividad_economica TEXT,
          descripcion TEXT,
          logo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar datos iniciales se hace en el script de actualización
      console.log('Base de datos inicializada correctamente');
      resolve();
    });
  });
};
