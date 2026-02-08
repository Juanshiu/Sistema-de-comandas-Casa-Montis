import { Kysely, sql } from 'kysely';

/**
 * Migración 029: Agregar columna `codigo` (SKU) a productos, insumos, 
 * items_personalizacion y categorias_personalizacion.
 * 
 * - El codigo es legible (PROD-001, INS-001, PER-001, CPER-001)
 * - Único por empresa_id (índice compuesto)
 * - Se autogenera para registros existentes
 * - El UUID sigue siendo la PK interna
 */
export async function up(db: Kysely<any>): Promise<void> {
    // ========== 1. Agregar columna codigo a productos ==========
    const colProductos = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'codigo'
    `.execute(db);

    if ((colProductos.rows as any[]).length === 0) {
        await db.schema.alterTable('productos')
            .addColumn('codigo', 'text')
            .execute();
    }

    // ========== 2. Agregar columna codigo a insumos ==========
    const colInsumos = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'insumos' AND column_name = 'codigo'
    `.execute(db);

    if ((colInsumos.rows as any[]).length === 0) {
        await db.schema.alterTable('insumos')
            .addColumn('codigo', 'text')
            .execute();
    }

    // ========== 3. Agregar columna codigo a items_personalizacion ==========
    const colItems = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'items_personalizacion' AND column_name = 'codigo'
    `.execute(db);

    if ((colItems.rows as any[]).length === 0) {
        await db.schema.alterTable('items_personalizacion')
            .addColumn('codigo', 'text')
            .execute();
    }

    // ========== 4. Agregar columna codigo a categorias_personalizacion ==========
    const colCatPer = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'categorias_personalizacion' AND column_name = 'codigo'
    `.execute(db);

    if ((colCatPer.rows as any[]).length === 0) {
        await db.schema.alterTable('categorias_personalizacion')
            .addColumn('codigo', 'text')
            .execute();
    }

    // ========== 5. Autogenerar códigos para registros existentes ==========

    // Productos: PROD-001, PROD-002, ...
    await sql`
        WITH numbered AS (
            SELECT id, empresa_id,
                   ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, nombre) AS rn
            FROM productos
            WHERE codigo IS NULL
        )
        UPDATE productos SET codigo = 'PROD-' || LPAD(numbered.rn::text, 3, '0')
        FROM numbered
        WHERE productos.id = numbered.id
    `.execute(db);

    // Insumos: INS-001, INS-002, ...
    await sql`
        WITH numbered AS (
            SELECT id, empresa_id,
                   ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at, nombre) AS rn
            FROM insumos
            WHERE codigo IS NULL
        )
        UPDATE insumos SET codigo = 'INS-' || LPAD(numbered.rn::text, 3, '0')
        FROM numbered
        WHERE insumos.id = numbered.id
    `.execute(db);

    // Items personalización: PER-001, PER-002, ...
    await sql`
        WITH numbered AS (
            SELECT id, empresa_id,
                   ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY nombre) AS rn
            FROM items_personalizacion
            WHERE codigo IS NULL
        )
        UPDATE items_personalizacion SET codigo = 'PER-' || LPAD(numbered.rn::text, 3, '0')
        FROM numbered
        WHERE items_personalizacion.id = numbered.id
    `.execute(db);

    // Categorías personalización: CPER-001, CPER-002, ...
    await sql`
        WITH numbered AS (
            SELECT id, empresa_id,
                   ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY orden, nombre) AS rn
            FROM categorias_personalizacion
            WHERE codigo IS NULL
        )
        UPDATE categorias_personalizacion SET codigo = 'CPER-' || LPAD(numbered.rn::text, 3, '0')
        FROM numbered
        WHERE categorias_personalizacion.id = numbered.id
    `.execute(db);

    // ========== 6. Hacer NOT NULL después de poblar ==========
    await sql`ALTER TABLE productos ALTER COLUMN codigo SET NOT NULL`.execute(db);
    await sql`ALTER TABLE insumos ALTER COLUMN codigo SET NOT NULL`.execute(db);
    await sql`ALTER TABLE items_personalizacion ALTER COLUMN codigo SET NOT NULL`.execute(db);
    await sql`ALTER TABLE categorias_personalizacion ALTER COLUMN codigo SET NOT NULL`.execute(db);

    // ========== 7. Índices únicos compuestos (empresa_id, codigo) ==========
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_empresa_codigo
        ON productos (empresa_id, codigo)
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_empresa_codigo
        ON insumos (empresa_id, codigo)
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_items_personalizacion_empresa_codigo
        ON items_personalizacion (empresa_id, codigo)
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_personalizacion_empresa_codigo
        ON categorias_personalizacion (empresa_id, codigo)
    `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    // Eliminar índices
    await sql`DROP INDEX IF EXISTS idx_productos_empresa_codigo`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_insumos_empresa_codigo`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_items_personalizacion_empresa_codigo`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_categorias_personalizacion_empresa_codigo`.execute(db);

    // Eliminar columnas
    await db.schema.alterTable('productos').dropColumn('codigo').execute();
    await db.schema.alterTable('insumos').dropColumn('codigo').execute();
    await db.schema.alterTable('items_personalizacion').dropColumn('codigo').execute();
    await db.schema.alterTable('categorias_personalizacion').dropColumn('codigo').execute();
}
