import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { EmpresasTable } from '../database/types';

export type Empresa = Selectable<EmpresasTable>;
export type NewEmpresa = Insertable<EmpresasTable>;
export type EmpresaUpdate = Updateable<EmpresasTable>;

export class EmpresaRepository {
  async findById(id: string): Promise<Empresa | undefined> {
    return await db.selectFrom('empresas')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  async create(empresa: NewEmpresa): Promise<Empresa> {
    return await db.insertInto('empresas')
      .values(empresa)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
