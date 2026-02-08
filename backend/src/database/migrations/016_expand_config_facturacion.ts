import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Agregar columnas faltantes a config_facturacion
    const columnsToAdd = [
        { name: 'nombre_empresa', type: 'VARCHAR(255)' },
        { name: 'nit', type: 'VARCHAR(50)' },
        { name: 'responsable_iva', type: 'BOOLEAN DEFAULT false' },
        { name: 'porcentaje_iva', type: 'DECIMAL(5,2) DEFAULT 19' },
        { name: 'telefonos', type: 'JSONB DEFAULT \'[]\'::jsonb' },
        { name: 'representante_legal', type: 'VARCHAR(255)' },
        { name: 'tipo_identificacion', type: 'VARCHAR(50)' },
        { name: 'departamento', type: 'VARCHAR(100)' },
        { name: 'ciudad', type: 'VARCHAR(100)' },
        { name: 'tributos', type: 'JSONB DEFAULT \'[]\'::jsonb' }
    ]

    for (const col of columnsToAdd) {
        const exists = await sql<{ column_name: string }>`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'config_facturacion' 
            AND column_name = ${col.name}
        `.execute(db)

        if (exists.rows.length === 0) {
            await sql.raw(`ALTER TABLE config_facturacion ADD COLUMN ${col.name} ${col.type}`).execute(db)
        }
    }
}

export async function down(db: Kysely<any>): Promise<void> {
    // No eliminar columnas en down para evitar pérdida de datos
}
