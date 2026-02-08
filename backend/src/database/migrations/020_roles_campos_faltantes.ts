import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Agregar columnas faltantes a la tabla roles
  await db.schema
    .alterTable('roles')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('es_superusuario', 'boolean', (col) => col.defaultTo(false).notNull())
    .execute();

  // Actualizar roles existentes que se llamen "SuperAdmin" o "Administrador" como superusuario
  await sql`
    UPDATE roles 
    SET es_superusuario = true 
    WHERE nombre IN ('SuperAdmin', 'Administrador')
  `.execute(db);

  console.log('✅ Migración 020: Agregadas columnas activo y es_superusuario a roles');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('roles')
    .dropColumn('activo')
    .dropColumn('es_superusuario')
    .execute();
}
