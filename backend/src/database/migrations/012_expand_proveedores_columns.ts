import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('proveedores')
    .addColumn('documento', 'text')
    .addColumn('correo', 'text')
    .addColumn('direccion', 'text')
    .addColumn('descripcion', 'text')
    .addColumn('pais', 'text')
    .addColumn('departamento', 'text')
    .addColumn('ciudad', 'text')
    .addColumn('banco_nombre', 'text')
    .addColumn('banco_tipo_cuenta', 'text')
    .addColumn('banco_titular', 'text')
    .addColumn('banco_nit_titular', 'text')
    .addColumn('banco_numero_cuenta', 'text')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('proveedores')
    .dropColumn('documento')
    .dropColumn('correo')
    .dropColumn('direccion')
    .dropColumn('descripcion')
    .dropColumn('pais')
    .dropColumn('departamento')
    .dropColumn('ciudad')
    .dropColumn('banco_nombre')
    .dropColumn('banco_tipo_cuenta')
    .dropColumn('banco_titular')
    .dropColumn('banco_nit_titular')
    .dropColumn('banco_numero_cuenta')
    .dropColumn('activo')
    .dropColumn('updated_at')
    .execute()
}
