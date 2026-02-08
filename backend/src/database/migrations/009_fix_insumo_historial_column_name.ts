import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('insumo_historial')
    .renameColumn('fecha', 'fecha_hora')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('insumo_historial')
    .renameColumn('fecha_hora', 'fecha')
    .execute()
}
