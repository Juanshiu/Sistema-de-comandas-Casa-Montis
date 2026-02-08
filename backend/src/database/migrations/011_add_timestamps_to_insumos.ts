import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Agregar timestamps a insumos
  await db.schema
    .alterTable('insumos')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // Agregar timestamps a insumo_categorias
  await db.schema
    .alterTable('insumo_categorias')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('insumos')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute()

  await db.schema
    .alterTable('insumo_categorias')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute()
}
