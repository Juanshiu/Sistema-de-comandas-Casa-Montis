import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Crear tabla historial_inventario si no existe
    await sql`
        CREATE TABLE IF NOT EXISTS historial_inventario (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID NOT NULL REFERENCES empresas(id),
            insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
            producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
            tipo_movimiento VARCHAR(50) NOT NULL,
            cantidad DECIMAL(12,3) NOT NULL,
            motivo TEXT,
            usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            fecha TIMESTAMP DEFAULT NOW()
        )
    `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
    await sql`DROP TABLE IF EXISTS historial_inventario`.execute(db)
}
