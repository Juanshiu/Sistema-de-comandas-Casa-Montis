import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 1. Añadir empresa_id a nomina_detalles
    await db.schema
        .alterTable('nomina_detalles')
        .addColumn('empresa_id', 'uuid', (col) => col.references('empresas.id').onDelete('cascade'))
        .execute();

    // 2. Crear índices para todas las tablas que tienen empresa_id
    const tables = [
        'usuarios', 'roles', 'permisos_rol', 'salones', 'mesas', 
        'categorias_productos', 'productos', 'insumos', 'producto_insumos',
        'comandas', 'comanda_items', 'comanda_mesas', 'facturas', 
        'config_facturacion', 'proveedores', 'categorias_personalizacion', 
        'items_personalizacion', 'personalizacion_insumos', 'empleados', 
        'nominas', 'contratos', 'config_sistema'
    ];

    for (const table of tables) {
        const indexName = `idx_${table}_empresa_id`;
        await sql`CREATE INDEX IF NOT EXISTS ${sql.raw(indexName)} ON ${sql.raw(table)} (empresa_id)`.execute(db);
    }
    
    // Índice adicional para nomina_detalles
    await sql`CREATE INDEX IF NOT EXISTS idx_nomina_detalles_empresa_id ON nomina_detalles (empresa_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    // Reverción de índices
    const tables = [
        'usuarios', 'roles', 'permisos_rol', 'salones', 'mesas', 
        'categorias_productos', 'productos', 'insumos', 'producto_insumos',
        'comandas', 'comanda_items', 'comanda_mesas', 'facturas', 
        'config_facturacion', 'proveedores', 'categorias_personalizacion', 
        'items_personalizacion', 'personalizacion_insumos', 'empleados', 
        'nominas', 'contratos', 'config_sistema', 'nomina_detalles'
    ];

    for (const table of tables) {
        const indexName = `idx_${table}_empresa_id`;
        await sql`DROP INDEX IF EXISTS ${sql.raw(indexName)}`.execute(db);
    }

    await db.schema
        .alterTable('nomina_detalles')
        .dropColumn('empresa_id')
        .execute();
}
