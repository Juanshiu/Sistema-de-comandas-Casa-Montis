import { ProductoRepository, NewProducto, ProductoUpdate } from '../repositories/productoRepository';
import { CategoriaRepository } from '../repositories/categoriaRepository';
import { db } from '../database/database';
import { sql } from 'kysely';

const productoRepository = new ProductoRepository();
const categoriaRepository = new CategoriaRepository();

/** Genera el siguiente código SKU disponible para productos de una empresa */
const generarCodigoProducto = async (empresaId: string): Promise<string> => {
  const result = await sql`
    SELECT codigo FROM productos
    WHERE empresa_id = ${empresaId}
      AND codigo LIKE 'PROD-%'
    ORDER BY codigo DESC
    LIMIT 1
  `.execute(db);

  let nextNum = 1;
  if ((result.rows as any[]).length > 0) {
    const last = (result.rows as any[])[0].codigo as string;
    const num = parseInt(last.replace('PROD-', ''), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `PROD-${String(nextNum).padStart(3, '0')}`;
};

export class ProductoService {
  async listarProductos(empresaId: string, soloDisponibles = false) {
    return await productoRepository.findAllByEmpresa(empresaId, soloDisponibles);
  }

  async obtenerProducto(id: string, empresaId: string) {
    const producto = await productoRepository.findById(id, empresaId);
    if (!producto) throw new Error('Producto no encontrado');
    return producto;
  }

  async listarPorCategoria(categoriaIdOrName: string, empresaId: string) {
    // Verificar si es UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoriaIdOrName);

    if (isUUID) {
      return await productoRepository.findByCategoria(categoriaIdOrName, empresaId);
    } else {
      // Si no es UUID, buscar por nombre de categoría
      const cat = await categoriaRepository.findByNombre(categoriaIdOrName, empresaId);
      if (cat) {
        return await productoRepository.findByCategoria(cat.id, empresaId);
      }
      // Si no se encuentra la categoría por nombre, retornar vacío
      return [];
    }
  }

  async crearProducto(empresaId: string, data: any) {
    if (!data.nombre || data.precio === undefined) {
      throw new Error('Nombre y precio son requeridos');
    }

    // Validar categoría: puede venir como categoria_id (UUID) o categoria (nombre)
    let categoriaId = null;
    if (data.categoria_id) {
      const cat = await categoriaRepository.findById(data.categoria_id, empresaId);
      if (!cat) throw new Error('La categoría especificada no existe');
      categoriaId = cat.id;
    } else if (data.categoria) {
      // El frontend envía el nombre de la categoría, buscarla por nombre
      const cat = await categoriaRepository.findByNombre(data.categoria, empresaId);
      if (cat) {
        categoriaId = cat.id;
      }
      // Si no existe, no es un error crítico - el producto puede no tener categoría
    }

    const codigoAuto = await generarCodigoProducto(empresaId);

    const nuevo: NewProducto = {
      empresa_id: empresaId,
      codigo: codigoAuto,
      nombre: data.nombre,
      descripcion: data.descripcion,
      precio: data.precio,
      categoria_id: categoriaId,
      disponible: data.disponible !== undefined ? data.disponible : true,
      tiene_personalizacion: !!data.tiene_personalizacion,
      usa_inventario: !!data.usa_inventario,
      usa_insumos: !!data.usa_insumos,
      // Mapear campos de inventario básico
      cantidad_inicial: data.usa_inventario ? (data.cantidad_inicial || 0) : 0,
      cantidad_actual: data.usa_inventario ? (data.cantidad_actual || data.cantidad_inicial || 0) : 0,
      stock: data.usa_inventario ? (data.cantidad_actual || data.cantidad_inicial || 0) : 0,
      imagen_url: data.imagen_url,
      personalizaciones_habilitadas: data.personalizaciones_habilitadas 
        ? JSON.stringify(data.personalizaciones_habilitadas) 
        : null
    };

    return await productoRepository.create(nuevo);
  }

  async actualizarProducto(id: string, empresaId: string, data: any) {
    // Validar categoría: puede venir como categoria_id (UUID) o categoria (nombre)
    let categoriaId = data.categoria_id;
    if (data.categoria_id) {
      const cat = await categoriaRepository.findById(data.categoria_id, empresaId);
      if (!cat) throw new Error('La categoría especificada no existe');
    } else if (data.categoria) {
      const cat = await categoriaRepository.findByNombre(data.categoria, empresaId);
      if (cat) {
        categoriaId = cat.id;
      }
    }

    const update: ProductoUpdate = {
      nombre: data.nombre,
      descripcion: data.descripcion,
      precio: data.precio,
      categoria_id: categoriaId,
      disponible: data.disponible,
      tiene_personalizacion: data.tiene_personalizacion,
      usa_inventario: data.usa_inventario,
      usa_insumos: data.usa_insumos,
      // Mapear campos de inventario básico
      cantidad_inicial: data.cantidad_inicial,
      cantidad_actual: data.cantidad_actual,
      stock: data.cantidad_actual, // Legacy "stock" sync
      imagen_url: data.imagen_url,
      personalizaciones_habilitadas: data.personalizaciones_habilitadas 
        ? JSON.stringify(data.personalizaciones_habilitadas) 
        : undefined,
      updated_at: new Date() as any
    };

    // Clean undefined
    Object.keys(update).forEach(key => (update as any)[key] === undefined && delete (update as any)[key]);

    const actualizado = await productoRepository.update(id, empresaId, update);
    if (!actualizado) throw new Error('Producto no encontrado');
    
    return actualizado;
  }

  async eliminarProducto(id: string, empresaId: string) {
    return await productoRepository.delete(id, empresaId);
  }
}
