"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDatabaseWithProducts = void 0;
const init_1 = require("./init");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Cargar productos desde el JSON
const productosPath = path_1.default.resolve(__dirname, '../../data/productos_casa_montis.json');
let productos = [];
try {
    if (fs_1.default.existsSync(productosPath)) {
        const productosData = fs_1.default.readFileSync(productosPath, 'utf8');
        productos = JSON.parse(productosData);
    }
    else {
        console.log('Archivo de productos no encontrado, usando productos por defecto');
    }
}
catch (error) {
    console.error('Error al cargar productos:', error);
}
// Mapear categorías del JSON a nuestro sistema
const mapearCategoria = (categoriaOriginal) => {
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
    return mapeo[categoriaOriginal] || 'otros';
};
const updateDatabaseWithProducts = async () => {
    return new Promise((resolve, reject) => {
        init_1.db.serialize(() => {
            // Actualizar tabla mesas para incluir salones
            init_1.db.run(`
        ALTER TABLE mesas ADD COLUMN salon TEXT DEFAULT 'Principal'
      `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.log('Columna salon ya existe o error menor:', err.message);
                }
            });
            // Limpiar productos existentes
            init_1.db.run('DELETE FROM productos', (err) => {
                if (err) {
                    console.error('Error al limpiar productos:', err);
                    reject(err);
                    return;
                }
                // Limpiar mesas existentes
                init_1.db.run('DELETE FROM mesas', (err) => {
                    if (err) {
                        console.error('Error al limpiar mesas:', err);
                        reject(err);
                        return;
                    }
                    // Insertar mesas por salones
                    const mesasData = [
                        // Salón Principal (10 mesas)
                        { numero: '1', capacidad: 4, salon: 'Principal' },
                        { numero: '2', capacidad: 4, salon: 'Principal' },
                        { numero: '3', capacidad: 2, salon: 'Principal' },
                        { numero: '4', capacidad: 6, salon: 'Principal' },
                        { numero: '5', capacidad: 4, salon: 'Principal' },
                        { numero: '6', capacidad: 2, salon: 'Principal' },
                        { numero: '7', capacidad: 8, salon: 'Principal' },
                        { numero: '8', capacidad: 4, salon: 'Principal' },
                        { numero: '9', capacidad: 2, salon: 'Principal' },
                        { numero: '10', capacidad: 4, salon: 'Principal' },
                        // Salón 1 (4 mesas)
                        { numero: '1.1', capacidad: 4, salon: 'Salón 1' },
                        { numero: '1.2', capacidad: 4, salon: 'Salón 1' },
                        { numero: '1.3', capacidad: 2, salon: 'Salón 1' },
                        { numero: '1.4', capacidad: 6, salon: 'Salón 1' },
                        // Salón 2 (4 mesas)
                        { numero: '2.1', capacidad: 4, salon: 'Salón 2' },
                        { numero: '2.2', capacidad: 4, salon: 'Salón 2' },
                        { numero: '2.3', capacidad: 2, salon: 'Salón 2' },
                        { numero: '2.4', capacidad: 6, salon: 'Salón 2' },
                        // Salón 3 (5 mesas)
                        { numero: '3.1', capacidad: 4, salon: 'Salón 3' },
                        { numero: '3.2', capacidad: 4, salon: 'Salón 3' },
                        { numero: '3.3', capacidad: 2, salon: 'Salón 3' },
                        { numero: '3.4', capacidad: 6, salon: 'Salón 3' },
                        { numero: '3.5', capacidad: 8, salon: 'Salón 3' },
                        // Salón 4 (1 mesa)
                        { numero: '4.1', capacidad: 10, salon: 'Salón 4' },
                        // Salón 5 (1 mesa)
                        { numero: '5.1', capacidad: 8, salon: 'Salón 5' }
                    ];
                    let mesasInserted = 0;
                    const totalMesas = mesasData.length;
                    mesasData.forEach((mesa) => {
                        init_1.db.run('INSERT INTO mesas (numero, capacidad, salon) VALUES (?, ?, ?)', [mesa.numero, mesa.capacidad, mesa.salon], (err) => {
                            if (err) {
                                console.error('Error al insertar mesa:', err);
                            }
                            mesasInserted++;
                            if (mesasInserted === totalMesas) {
                                // Insertar productos desde JSON
                                if (productos.length > 0) {
                                    let productosInserted = 0;
                                    const totalProductos = productos.length;
                                    productos.forEach((producto) => {
                                        const categoria = mapearCategoria(producto.categoria);
                                        init_1.db.run('INSERT INTO productos (nombre, precio, categoria, disponible) VALUES (?, ?, ?, ?)', [producto.nombre, producto.precio, categoria, 1], (err) => {
                                            if (err) {
                                                console.error('Error al insertar producto:', producto.nombre, err);
                                            }
                                            productosInserted++;
                                            if (productosInserted === totalProductos) {
                                                console.log(`✅ Base de datos actualizada: ${totalMesas} mesas y ${totalProductos} productos`);
                                                resolve();
                                            }
                                        });
                                    });
                                }
                                else {
                                    console.log('✅ Mesas actualizadas, productos no disponibles');
                                    resolve();
                                }
                            }
                        });
                    });
                });
            });
        });
    });
};
exports.updateDatabaseWithProducts = updateDatabaseWithProducts;
//# sourceMappingURL=update.js.map