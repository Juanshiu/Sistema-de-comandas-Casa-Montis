import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // Agregar columna para almacenar la plantilla de texto usada al generar el contrato
    await db.schema
        .alterTable('contratos')
        .addColumn('contrato_template', 'text')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('contratos')
        .dropColumn('contrato_template')
        .execute();
}
