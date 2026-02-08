import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('contratos')
        .addColumn('duracion_contrato', 'text')
        .addColumn('cargo', 'text')
        .addColumn('salario', 'decimal')
        .addColumn('file_name', 'text')
        .addColumn('file_path', 'text')
        .addColumn('contrato_details', 'jsonb')
        .addColumn('usuario_id', 'uuid')
        .addColumn('usuario_nombre', 'text')
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    // Migrar datos de 'detalles' a 'contrato_details' si existe
    await sql`UPDATE contratos SET contrato_details = detalles WHERE detalles IS NOT NULL`.execute(db);

    await db.schema.alterTable('contratos').dropColumn('detalles').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('contratos')
        .addColumn('detalles', 'jsonb')
        .execute();

    await sql`UPDATE contratos SET detalles = contrato_details`.execute(db);

    await db.schema.alterTable('contratos').dropColumn('duracion_contrato').execute();
    await db.schema.alterTable('contratos').dropColumn('cargo').execute();
    await db.schema.alterTable('contratos').dropColumn('salario').execute();
    await db.schema.alterTable('contratos').dropColumn('file_name').execute();
    await db.schema.alterTable('contratos').dropColumn('file_path').execute();
    await db.schema.alterTable('contratos').dropColumn('contrato_details').execute();
    await db.schema.alterTable('contratos').dropColumn('usuario_id').execute();
    await db.schema.alterTable('contratos').dropColumn('usuario_nombre').execute();
    await db.schema.alterTable('contratos').dropColumn('created_at').execute();
}
