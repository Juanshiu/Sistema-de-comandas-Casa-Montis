const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:juanshiu2110@localhost:5432/Montis_Cloud'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query(`
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
        `);
        console.log('✅ Tabla nomina_pagos creada exitosamente');
        
        // Verificar
        const result = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'nomina_pagos'`);
        console.log('Verificación:', result.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
