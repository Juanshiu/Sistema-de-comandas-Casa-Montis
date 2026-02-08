import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { ProductosTable } from '../database/types';

export type Producto = Selectable<ProductosTable>;
export type NewProducto = Insertable<ProductosTable>;
export type ProductoUpdate = Updateable<ProductosTable>;

export class ProductoRepository {
  async findAllByEmpresa(empresaId: string, soloDisponibles = false): Promise<any[]> {
    let query = db.selectFrom('productos')
      .leftJoin('categorias_productos', 'categorias_productos.id', 'productos.categoria_id')
      .select([
        'productos.id',
        'productos.codigo',
        'productos.nombre',
        'productos.descripcion',
        'productos.precio',
        'productos.disponible',
        'productos.tiene_personalizacion',
        'productos.usa_inventario',
        'productos.usa_insumos',
        'productos.stock',
        'productos.cantidad_inicial',
        'productos.cantidad_actual',
        'productos.personalizaciones_habilitadas',
        'productos.imagen_url',
        'productos.categoria_id',
        'categorias_productos.nombre as categoria', // El frontend espera 'categoria' (nombre)
        'categorias_productos.nombre as categoria_nombre' // Mantener por compatibilidad
      ])
      .where('productos.empresa_id', '=', empresaId)
      .orderBy('categorias_productos.nombre') // Agrupar visualmente por categoría
      .orderBy('productos.nombre');

    if (soloDisponibles) {
      query = query
        .where('productos.disponible', '=', true)
        .where((eb) => eb.or([
            eb('categorias_productos.activo', '=', true),
            eb('categorias_productos.id', 'is', null) // Productos sin categoría aparecen si están disponibles
        ]));
    }

    return await query.execute();
  }

  async findByCategoria(categoriaId: string, empresaId: string): Promise<Producto[]> {
      return await db.selectFrom('productos')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('categoria_id', '=', categoriaId)
      .where('disponible', '=', true)
      .orderBy('nombre')
      .execute();
  }

  async findById(id: string, empresaId: string): Promise<Producto | undefined> {
    return await db.selectFrom('productos')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async create(producto: NewProducto): Promise<Producto> {
    return await db.insertInto('productos')
      .values(producto)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, empresaId: string, update: ProductoUpdate): Promise<Producto | undefined> {
    return await db.updateTable('productos')
      .set(update)
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, empresaId: string): Promise<boolean> {
    const result = await db.deleteFrom('productos')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }
}
