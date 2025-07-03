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
      // Verificar si ya existen productos
      db.get('SELECT COUNT(*) as count FROM productos', (err, row: any) => {
        if (err) {
          console.error('Error al verificar productos:', err);
          reject(err);
          return;
        }

        const productosExisten = row.count > 0;

        // Solo insertar productos si no existen
        if (!productosExisten && productos.length > 0) {
          console.log('Insertando productos iniciales...');
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
                  console.log(`✅ Productos iniciales insertados: ${totalProductos}`);
                  resolve();
                }
              }
            );
          });
        } else {
          if (productosExisten) {
            console.log('✅ Productos ya existen, no se sobrescriben');
          } else {
            console.log('✅ No hay productos para insertar');
          }
          resolve();
        }
      });
    });
  });
};
