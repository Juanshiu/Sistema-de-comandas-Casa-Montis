"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const dbDir = path_1.default.dirname(dbPath);
// Crear directorio de base de datos si no existe
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
exports.db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
    }
    else {
        console.log('Conectado a la base de datos SQLite');
    }
});
const initDatabase = async () => {
    return new Promise((resolve, reject) => {
        exports.db.serialize(() => {
            // Tabla Mesas
            exports.db.run(`
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
            exports.db.run(`
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
            // Tabla Comandas
            exports.db.run(`
        CREATE TABLE IF NOT EXISTS comandas (
          id TEXT PRIMARY KEY,
          mesa_id INTEGER NOT NULL,
          mesero TEXT NOT NULL,
          subtotal REAL NOT NULL,
          total REAL NOT NULL,
          estado TEXT DEFAULT 'pendiente',
          observaciones_generales TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mesa_id) REFERENCES mesas (id)
        )
      `);
            // Tabla Items de Comanda
            exports.db.run(`
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
            exports.db.run(`
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
            // Insertar datos iniciales se hace en el script de actualización
            console.log('Base de datos inicializada correctamente');
            resolve();
        });
    });
};
exports.initDatabase = initDatabase;
//# sourceMappingURL=init.js.map