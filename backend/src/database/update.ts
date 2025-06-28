import { db, initDatabase } from './init';
import fs from 'fs';
import path from 'path';

// Cargar productos desde el JSON
const productosPath = path.resolve(__dirname, '../../data/productos_casa_montis.json');
let productos: any[] = [];

try {
  if (fs.existsSync(productosPath)) {
    const productosData = fs.readFileSync(productosPath, 'utf8');
    productos = JSON.parse(productosData);
  } else {
    console.log('Archivo de productos no encontrado, usando productos por defecto');
  }
} catch (error) {
  console.error('Error al cargar productos:', error);
}

// Mapear categorías del JSON a nuestro sistema
const mapearCategoria = (categoriaOriginal: string): string => {
  const mapeo: { [key: string]: string } = {
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

export const updateDatabaseWithProducts = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Actualizar tabla mesas para incluir salones
      db.run(`
        ALTER TABLE mesas ADD COLUMN salon TEXT DEFAULT 'Principal'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.log('Columna salon ya existe o error menor:', err.message);
        }
      });

      // Limpiar productos existentes
      db.run('DELETE FROM productos', (err) => {
        if (err) {
          console.error('Error al limpiar productos:', err);
          reject(err);
          return;
        }

        // Limpiar mesas existentes
        db.run('DELETE FROM mesas', (err) => {
          if (err) {
            console.error('Error al limpiar mesas:', err);
            reject(err);
            return;
          }

          // Insertar mesas por salones
          const mesasData = [
             // Salón Principal (9 mesas)
            { numero: '1', capacidad: 6, salon: 'Principal' },
            { numero: '2', capacidad: 6, salon: 'Principal' },
            { numero: '3', capacidad: 6, salon: 'Principal' },
            { numero: '4', capacidad: 6, salon: 'Principal' },
            { numero: '5', capacidad: 6, salon: 'Principal' },
            { numero: '6', capacidad: 6, salon: 'Principal' },
            { numero: '7', capacidad: 4, salon: 'Principal' },
            { numero: '8', capacidad: 4, salon: 'Principal' },
            { numero: '9', capacidad: 6, salon: 'Principal' },
            
            // Salón 1 (4 mesas)
            { numero: '1-1', capacidad: 4, salon: 'Salón 1' },
            { numero: '1-2', capacidad: 2, salon: 'Salón 1' },
            { numero: '1-3', capacidad: 6, salon: 'Salón 1' },
            { numero: '1-4', capacidad: 4, salon: 'Salón 1' },
            
            // Salón 2 (4 mesas)
            { numero: '2-1', capacidad: 4, salon: 'Salón 2' },
            { numero: '2-2', capacidad: 2, salon: 'Salón 2' },
            { numero: '2-3', capacidad: 6, salon: 'Salón 2' },
            { numero: '2-4', capacidad: 4, salon: 'Salón 2' },
            
            // Salón 3 (5 mesas)
            { numero: '3-1', capacidad: 4, salon: 'Salón 3' },
            { numero: '3-2', capacidad: 2, salon: 'Salón 3' },
            { numero: '3-3', capacidad: 6, salon: 'Salón 3' },
            { numero: '3-4', capacidad: 4, salon: 'Salón 3' },
            { numero: '3-5', capacidad: 8, salon: 'Salón 3' },
            
            // Salón 4 (1 mesa)
            { numero: '4-1', capacidad: 12, salon: 'Salón 4' },
            
            // Salón 5 (1 mesa)
            { numero: '5-1', capacidad: 10, salon: 'Salón 5' }
          ];

          let mesasInserted = 0;
          const totalMesas = mesasData.length;

          mesasData.forEach((mesa) => {
            db.run(
              'INSERT INTO mesas (numero, capacidad, salon) VALUES (?, ?, ?)',
              [mesa.numero, mesa.capacidad, mesa.salon],
              (err) => {
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
                      
                      db.run(
                        'INSERT INTO productos (nombre, precio, categoria, disponible) VALUES (?, ?, ?, ?)',
                        [producto.nombre, producto.precio, categoria, 1],
                        (err) => {
                          if (err) {
                            console.error('Error al insertar producto:', producto.nombre, err);
                          }
                          productosInserted++;
                          
                          if (productosInserted === totalProductos) {
                            console.log(`✅ Base de datos actualizada: ${totalMesas} mesas y ${totalProductos} productos`);
                            resolve();
                          }
                        }
                      );
                    });
                  } else {
                    console.log('✅ Mesas actualizadas, productos no disponibles');
                    resolve();
                  }
                }
              }
            );
          });
        });
      });
    });
  });
};
