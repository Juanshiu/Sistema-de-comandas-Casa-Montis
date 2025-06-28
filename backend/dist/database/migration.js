"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrarBaseDatos = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const migrarBaseDatos = async () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            db.serialize(() => {
                // Verificar si la columna salon existe
                db.all("PRAGMA table_info(mesas)", (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const salonColumnExists = rows.some(row => row.name === 'salon');
                    if (!salonColumnExists) {
                        console.log('Agregando columna salon a la tabla mesas...');
                        db.run("ALTER TABLE mesas ADD COLUMN salon TEXT DEFAULT 'Principal'", (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            console.log('Columna salon agregada exitosamente');
                            db.close();
                            resolve();
                        });
                    }
                    else {
                        console.log('La columna salon ya existe');
                        db.close();
                        resolve();
                    }
                });
            });
        });
    });
};
exports.migrarBaseDatos = migrarBaseDatos;
// Ejecutar si se llama directamente
if (require.main === module) {
    (0, exports.migrarBaseDatos)()
        .then(() => {
        console.log('Migración completada exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Error en la migración:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=migration.js.map