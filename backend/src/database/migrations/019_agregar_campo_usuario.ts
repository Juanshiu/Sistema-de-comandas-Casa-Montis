import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('🔄 Agregando campo usuario (nombre de usuario) a la tabla usuarios...');

  // Agregar campo usuario para identificar al empleado dentro de una empresa
  await db.schema
    .alterTable('usuarios')
    .addColumn('usuario', 'varchar(100)')
    .execute();

  // Poblar el campo usuario con el nombre sin espacios en minúsculas para usuarios existentes
  await sql`
    UPDATE usuarios 
    SET usuario = LOWER(REPLACE(nombre, ' ', '_'))
    WHERE usuario IS NULL
  `.execute(db);

  // Hacer el campo NOT NULL después de poblarlo
  await sql`ALTER TABLE usuarios ALTER COLUMN usuario SET NOT NULL`.execute(db);

  // Crear índice único compuesto: usuario debe ser único por empresa
  await db.schema
    .createIndex('idx_usuarios_empresa_usuario')
    .on('usuarios')
    .columns(['empresa_id', 'usuario'])
    .unique()
    .execute();

  console.log('✅ Campo usuario agregado correctamente');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('usuarios')
    .dropColumn('usuario')
    .execute();

  console.log('✅ Campo usuario eliminado');
}
