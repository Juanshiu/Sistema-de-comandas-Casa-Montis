import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Categorias Personalizacion
  await db.schema
    .alterTable('categorias_personalizacion')
    .addColumn('descripcion', 'text')
    .execute()

  // Items Personalizacion
  await db.schema
    .alterTable('items_personalizacion')
    .addColumn('descripcion', 'text')
    .addColumn('precio_adicional', 'integer', (col) => col.defaultTo(0))
    .addColumn('usa_insumos', 'boolean', (col) => col.defaultTo(false))
    .addColumn('cantidad_inicial', 'decimal', (col) => col.defaultTo(0))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('categorias_personalizacion')
    .dropColumn('descripcion')
    .execute()

  await db.schema
    .alterTable('items_personalizacion')
    .dropColumn('descripcion')
    .dropColumn('precio_adicional')
    .dropColumn('usa_insumos')
    .dropColumn('cantidad_inicial')
    .dropColumn('updated_at')
    .execute()
}

