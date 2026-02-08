import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { SalonesTable } from '../database/types';

export type Salon = Selectable<SalonesTable>;
export type NewSalon = Insertable<SalonesTable>;
export type SalonUpdate = Updateable<SalonesTable>;

export class SalonRepository {
  async findAllByEmpresa(empresaId: string): Promise<Salon[]> {
    return await db.selectFrom('salones')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .orderBy('nombre')
      .execute();
  }

  async findById(id: string, empresaId: string): Promise<Salon | undefined> {
    return await db.selectFrom('salones')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async create(salon: NewSalon): Promise<Salon> {
    return await db.insertInto('salones')
      .values(salon)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, empresaId: string, update: SalonUpdate): Promise<Salon | undefined> {
    return await db.updateTable('salones')
      .set(update)
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, empresaId: string): Promise<boolean> {
    const result = await db.deleteFrom('salones')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
  }
}
