import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // 0. Crear tabla insumo_categorias
  await db.schema
    .createTable('insumo_categorias')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('descripcion', 'text')
    .addColumn('orden', 'integer', (col) => col.defaultTo(0))
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .execute()

  // 1. Insumos - Agregar stock_critico y categoria_id
  await db.schema
    .alterTable('insumos')
    .addColumn('stock_critico', 'decimal', (col) => col.defaultTo(0))
    .addColumn('categoria_id', 'uuid', (col) => col.references('insumo_categorias.id').onDelete('set null'))
    .execute()

  // 2. Categorias Personalizacion - Agregar activo, orden, descripcion
  await db.schema
    .alterTable('categorias_personalizacion')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('orden', 'integer', (col) => col.defaultTo(0))
    .addColumn('descripcion', 'text')
    .execute()

  // 3. Items Personalizacion - Agregar activo, disponible, usa_inventario, cantidad_actual, cantidad_minima, descripcion, precio_adicional, usa_insumos, cantidad_inicial
  await db.schema
    .alterTable('items_personalizacion')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('disponible', 'boolean', (col) => col.defaultTo(true))
    .addColumn('usa_inventario', 'boolean', (col) => col.defaultTo(false))
    .addColumn('cantidad_actual', 'decimal', (col) => col.defaultTo(0))
    .addColumn('cantidad_minima', 'decimal', (col) => col.defaultTo(0))
    .addColumn('descripcion', 'text')
    .addColumn('precio_adicional', 'integer', (col) => col.defaultTo(0))
    .addColumn('usa_insumos', 'boolean', (col) => col.defaultTo(false))
    .addColumn('cantidad_inicial', 'decimal', (col) => col.defaultTo(0))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()
    
  // 4. Insumos Historial - Crear tabla si no existe o ajustar
  // Basado en inventario-avanzado.ts el cual hace INSERT INTO insumo_historial
  await db.schema
    .createTable('insumo_historial')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('insumo_id', 'uuid', (col) => col.notNull().references('insumos.id').onDelete('cascade'))
    .addColumn('cantidad', 'decimal', (col) => col.notNull())
    .addColumn('unidad_medida', 'text', (col) => col.notNull())
    .addColumn('producto_id', 'uuid', (col) => col.references('productos.id').onDelete('set null'))
    .addColumn('comanda_id', 'uuid', (col) => col.references('comandas.id').onDelete('set null'))
    .addColumn('tipo_evento', 'text', (col) => col.notNull()) // entrada, salida, ajuste, venta
    .addColumn('motivo', 'text')
    .addColumn('usuario_id', 'uuid', (col) => col.references('usuarios.id').onDelete('set null'))
    .addColumn('proveedor_id', 'uuid', (col) => col.references('proveedores.id').onDelete('set null'))
    .addColumn('fecha', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('insumo_historial').execute()
  
  await db.schema
    .alterTable('insumos')
    .dropColumn('stock_critico')
    .dropColumn('categoria_id')
    .execute()

  await db.schema
    .alterTable('categorias_personalizacion')
    .dropColumn('activo')
    .dropColumn('orden')
    .execute()

  await db.schema
    .alterTable('items_personalizacion')
    .dropColumn('activo')
    .dropColumn('disponible')
    .dropColumn('usa_inventario')
    .dropColumn('cantidad_actual')
    .dropColumn('cantidad_minima')
    .execute()
}
