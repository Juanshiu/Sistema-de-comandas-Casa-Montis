import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // Tabla de plantillas de contrato por empresa (multi-tenant)
    await db.schema
        .createTable('plantillas_contrato')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
        .addColumn('nombre', 'text', (col) => col.notNull())
        .addColumn('contenido', 'text', (col) => col.notNull())
        .addColumn('es_default', 'boolean', (col) => col.notNull().defaultTo(false))
        .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    // Índice para buscar plantillas por empresa rápidamente
    await db.schema
        .createIndex('idx_plantillas_contrato_empresa')
        .on('plantillas_contrato')
        .column('empresa_id')
        .execute();

    // Índice parcial: solo una plantilla default por empresa
    await sql`
        CREATE UNIQUE INDEX idx_plantillas_contrato_default_unico
        ON plantillas_contrato (empresa_id)
        WHERE es_default = true
    `.execute(db);

    // Asegurar que la columna contrato_template existe en contratos (idempotente)
    const result = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'contratos' AND column_name = 'contrato_template'
    `.execute(db);

    if ((result.rows as any[]).length === 0) {
        await db.schema
            .alterTable('contratos')
            .addColumn('contrato_template', 'text')
            .execute();
    }
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('plantillas_contrato').ifExists().execute();
}
