import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('mesas')
    .addColumn('ocupada', 'boolean', (col) => col.defaultTo(false))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('mesas')
    .dropColumn('ocupada')
    .execute()
}
