"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarProductos = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const productosJsonPath = path_1.default.join(__dirname, '../../data/productos_casa_montis.json');
// Mapeo de categorías del JSON a categorías del sistema
const mapearCategoria = (categoria) => {
    const mapeo = {
        'ALMUERZO': 'almuerzo',
        'DESAYUNO': 'desayuno',
        'ESPECIALES - PECHUGAS': 'carta_pechuga',
        'ESPECIALES - CARNES': 'carta_carne',
        'ESPECIALES - PASTAS': 'carta_pasta',
        'ESPECIALES - PESCADOS': 'carta_pescado',
        'ESPECIALES - ARROZ': 'carta_arroz',
        'SOPAS': 'sopa',
        'BEBIDAS': 'bebida',
        'CAFETERÍA': 'cafeteria',
        'PORCIONES': 'porciones',
        'Otros': 'otros'
    };
    return mapeo[categoria] || 'otros';
};
const importarProductos = async () => {
    return new Promise((resolve, reject) => {
        // Leer el archivo JSON
        if (!fs_1.default.existsSync(productosJsonPath)) {
            reject(new Error(`Archivo de productos no encontrado: ${productosJsonPath}`));
            return;
        }
        const productosJson = JSON.parse(fs_1.default.readFileSync(productosJsonPath, 'utf-8'));
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
            // Primero, limpiar la tabla de productos
            db.run('DELETE FROM productos', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('Tabla de productos limpiada');
                // Preparar statement para insertar productos
                const stmt = db.prepare(`
          INSERT INTO productos (nombre, precio, categoria, disponible)
          VALUES (?, ?, ?, 1)
        `);
                let insertados = 0;
                let errores = 0;
                productosJson.forEach((producto, index) => {
                    const categoria = mapearCategoria(producto.categoria);
                    stmt.run([producto.nombre, producto.precio, categoria], function (err) {
                        if (err) {
                            console.error(`Error al insertar producto ${producto.nombre}:`, err);
                            errores++;
                        }
                        else {
                            insertados++;
                        }
                        // Si es el último producto
                        if (index === productosJson.length - 1) {
                            stmt.finalize((err) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    db.close((err) => {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            console.log(`Importación completada: ${insertados} productos insertados, ${errores} errores`);
                                            resolve();
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            });
        });
    });
};
exports.importarProductos = importarProductos;
// Ejecutar si se llama directamente
if (require.main === module) {
    (0, exports.importarProductos)()
        .then(() => {
        console.log('Importación de productos completada exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Error en la importación de productos:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=import-productos.js.map