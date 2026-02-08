import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 1. Añadir empresa_id a sesiones
    await db.schema
        .alterTable('sesiones')
        .addColumn('empresa_id', 'uuid', (col) => col.references('empresas.id').onDelete('cascade'))
        .execute();

    // 2. Crear índice
    await sql`CREATE INDEX IF NOT EXISTS idx_sesiones_empresa_id ON sesiones (empresa_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_sesiones_empresa_id`.execute(db);
    await db.schema
        .alterTable('sesiones')
        .dropColumn('empresa_id')
        .execute();
}
