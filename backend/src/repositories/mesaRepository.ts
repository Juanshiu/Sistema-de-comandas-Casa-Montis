import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { MesasTable } from '../database/types';

export type Mesa = Selectable<MesasTable>;
export type NewMesa = Insertable<MesasTable>;
export type MesaUpdate = Updateable<MesasTable>;

export class MesaRepository {
  async findAllByEmpresa(empresaId: string): Promise<any[]> {
    // Join with salones to get salon name, mimicking old query
    return await db.selectFrom('mesas')
      .leftJoin('salones', 'salones.id', 'mesas.salon_id')
      .select([
        'mesas.id',
        'mesas.numero',
        'mesas.capacidad',
        'mesas.salon_id',
        'mesas.tipo',
        'mesas.x',
        'mesas.y',
        'mesas.width',
        'mesas.height',
        'mesas.activo',
        'mesas.ocupada',
        'salones.nombre as salon', // El frontend espera 'salon'
        'salones.nombre as salon_nombre' // Mantener por compatibilidad
      ])
      .where('mesas.empresa_id', '=', empresaId)
      // Sorting mixed types (numeric vs string numbers) in JS after fetch or try casting if needed.
      // Postgres sort is string based unless cast.
      // For now, simple sort.
      .orderBy('salones.nombre')
      .orderBy('mesas.numero')
      .execute();
  }

  async findById(id: string, empresaId: string): Promise<any | undefined> {
    return await db.selectFrom('mesas')
      .leftJoin('salones', 'salones.id', 'mesas.salon_id')
      .select([
        'mesas.id',
        'mesas.numero',
        'mesas.capacidad',
        'mesas.salon_id',
        'mesas.tipo',
        'mesas.x',
        'mesas.y',
        'mesas.width',
        'mesas.height',
        'mesas.activo',
        'mesas.ocupada',
        'mesas.empresa_id',
        'mesas.created_at',
        'salones.nombre as salon', // El frontend espera 'salon'
        'salones.nombre as salon_nombre'
      ])
      .where('mesas.id', '=', id)
      .where('mesas.empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async create(mesa: NewMesa): Promise<Mesa> {
    return await db.insertInto('mesas')
      .values(mesa)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, empresaId: string, update: MesaUpdate): Promise<Mesa | undefined> {
    return await db.updateTable('mesas')
      .set(update)
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, empresaId: string): Promise<boolean> {
    const result = await db.deleteFrom('mesas')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }
}
