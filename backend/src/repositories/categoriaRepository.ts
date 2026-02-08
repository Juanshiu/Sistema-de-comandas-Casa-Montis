import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { CategoriasProductosTable } from '../database/types';

export type Categoria = Selectable<CategoriasProductosTable>;
export type NewCategoria = Insertable<CategoriasProductosTable>;
export type CategoriaUpdate = Updateable<CategoriasProductosTable>;

export class CategoriaRepository {
  async findAllByEmpresa(empresaId: string, soloActivas = false): Promise<Categoria[]> {
    let query = db.selectFrom('categorias_productos')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .orderBy('orden')
      .orderBy('nombre');

    if (soloActivas) {
      query = query.where('activo', '=', true);
    }

    return await query.execute();
  }

  async findById(id: string, empresaId: string): Promise<Categoria | undefined> {
    return await db.selectFrom('categorias_productos')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }
  
  // Buscar por nombre (normalized slug) en la empresa
  async findByNombre(nombre: string, empresaId: string): Promise<Categoria | undefined> {
    return await db.selectFrom('categorias_productos')
      .selectAll()
      .where('nombre', '=', nombre) // En sistema antiguo usaban slug como nombre, ahora usaremos nombre real o slug? 
      // El código legado normalizaba el nombre. Sugiero mantener 'nombre' como display name y quizás agregar slug si fuera necesario, 
      // pero por ahora 'nombre' = 'Identificador legible'.
      // Sin embargo, si un usuario pone "Bebidas Calientes", ¿queremos que sea único? Sí.
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async create(categoria: NewCategoria): Promise<Categoria> {
    return await db.insertInto('categorias_productos')
      .values(categoria)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, empresaId: string, update: CategoriaUpdate): Promise<Categoria | undefined> {
    return await db.updateTable('categorias_productos')
      .set(update)
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, empresaId: string): Promise<boolean> {
    const result = await db.deleteFrom('categorias_productos')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }
}
