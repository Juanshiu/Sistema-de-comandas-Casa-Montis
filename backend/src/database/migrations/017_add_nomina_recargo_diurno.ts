import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Agregar columna porc_recargo_diurno si no existe
    const result = await sql<{ column_name: string }>`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'configuracion_nomina' 
        AND column_name = 'porc_recargo_diurno'
    `.execute(db)

    if (result.rows.length === 0) {
        await sql`
            ALTER TABLE configuracion_nomina 
            ADD COLUMN porc_recargo_diurno DECIMAL(5,2) DEFAULT 25
        `.execute(db)
    }

    // Crear tabla nomina_pagos si no existe
    await sql`
        CREATE TABLE IF NOT EXISTS nomina_pagos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID NOT NULL REFERENCES empresas(id),
            nomina_id UUID NOT NULL REFERENCES nominas(id) ON DELETE CASCADE,
            valor DECIMAL(12,2) NOT NULL,
            fecha TIMESTAMP DEFAULT NOW(),
            tipo VARCHAR(50) DEFAULT 'QUINCENA',
            observaciones TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
    await sql`
        ALTER TABLE configuracion_nomina 
        DROP COLUMN IF EXISTS porc_recargo_diurno
    `.execute(db)
    
    await sql`DROP TABLE IF EXISTS nomina_pagos`.execute(db)
}
