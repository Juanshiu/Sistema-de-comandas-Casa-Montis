import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || './database/casa_montis.db';
const productosJsonPath = path.join(__dirname, '../../data/productos_casa_montis.json');

interface ProductoJson {
  categoria: string;
  nombre: string;
  precio: number;
}

// Mapeo de categorías del JSON a categorías del sistema
const mapearCategoria = (categoria: string): string => {
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
  
  return mapeo[categoria] || 'otros';
};

export const importarProductos = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Leer el archivo JSON
    if (!fs.existsSync(productosJsonPath)) {
      reject(new Error(`Archivo de productos no encontrado: ${productosJsonPath}`));
      return;
    }

    const productosJson: ProductoJson[] = JSON.parse(
      fs.readFileSync(productosJsonPath, 'utf-8')
    );

    const db = new sqlite3.Database(dbPath, (err) => {
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
          
          stmt.run([producto.nombre, producto.precio, categoria], function(err) {
            if (err) {
              console.error(`Error al insertar producto ${producto.nombre}:`, err);
              errores++;
            } else {
              insertados++;
            }

            // Si es el último producto
            if (index === productosJson.length - 1) {
              stmt.finalize((err) => {
                if (err) {
                  reject(err);
                } else {
                  db.close((err) => {
                    if (err) {
                      reject(err);
                    } else {
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

// Ejecutar si se llama directamente
if (require.main === module) {
  importarProductos()
    .then(() => {
      console.log('Importación de productos completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la importación de productos:', error);
      process.exit(1);
    });
}
