import { db } from '../database/database';
import { Insertable, Selectable, Updateable } from 'kysely';
import { UsuariosTable } from '../database/types';

export type Usuario = Selectable<UsuariosTable>;
export type NewUsuario = Insertable<UsuariosTable>;
export type UsuarioUpdate = Updateable<UsuariosTable>;

export class UsuarioRepository {
  // En SaaS, siempre buscamos por email + contexto global (login) O por id + empresa_id (operaciones internas)
  
  // Usado para auth
  async findByEmailGlobal(email: string): Promise<Usuario | undefined> {
    return await db.selectFrom('usuarios')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
  }

  // Usado para validación de unicidad
  async findByEmail(email: string): Promise<Usuario | undefined> {
    return await db.selectFrom('usuarios')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Usuario | undefined> {
    return await db.selectFrom('usuarios')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async findAllByEmpresa(empresaId: string): Promise<any[]> {
    return await db.selectFrom('usuarios')
      .leftJoin('roles', 'roles.id', 'usuarios.rol_id')
      .select([
        'usuarios.id',
        'usuarios.nombre as nombre_completo',
        'usuarios.usuario',
        'usuarios.email',
        'usuarios.rol_id',
        'usuarios.activo',
        'usuarios.created_at',
        'roles.nombre as rol_nombre'
      ])
      .where('usuarios.empresa_id', '=', empresaId)
      .orderBy('usuarios.nombre')
      .execute();
  }

  async findByUsuarioAndEmpresa(usuario: string, empresaId: string): Promise<Usuario | undefined> {
    return await db.selectFrom('usuarios')
      .selectAll()
      .where('usuario', '=', usuario)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async findByEmailAndEmpresa(email: string, empresaId: string): Promise<Usuario | undefined> {
    return await db.selectFrom('usuarios')
      .selectAll()
      .where('email', '=', email)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
  }

  async create(usuario: NewUsuario): Promise<Usuario> {
    return await db.insertInto('usuarios')
      .values(usuario)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, empresaId: string, update: UsuarioUpdate): Promise<Usuario | undefined> {
    return await db.updateTable('usuarios')
      .set(update)
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, empresaId: string): Promise<boolean> {
    const result = await db.deleteFrom('usuarios')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
      
    // En Kysely postgres result.numDeletedRows es string o number dependiendo.
    return Number(result.numDeletedRows) > 0;
  }
}
