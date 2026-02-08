import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Productos - Agregar columnas faltantes para inventario avanzado
  await db.schema
    .alterTable('productos')
    .addColumn('usa_insumos', 'boolean', (col) => col.defaultTo(false))
    .addColumn('cantidad_inicial', 'decimal', (col) => col.defaultTo(0))
    .addColumn('cantidad_actual', 'decimal', (col) => col.defaultTo(0))
    .addColumn('personalizaciones_habilitadas', 'text') // JSON storage maybe? Legacy used text
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('productos')
    .dropColumn('usa_insumos')
    .dropColumn('cantidad_inicial')
    .dropColumn('cantidad_actual')
    .dropColumn('personalizaciones_habilitadas')
    .execute()
}
