import { db } from '../src/database/database';
import { sql } from 'kysely';

async function checkColumns() {
    try {
        const result = await sql`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'config_facturacion' 
            ORDER BY ordinal_position
        `.execute(db);

        console.log('Columnas en config_facturacion:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        // Consultar todos los registros
        const data = await db
            .selectFrom('config_facturacion')
            .selectAll()
            .execute();
        
        console.log('\nDatos existentes:', data.length, 'registros');
        if (data.length > 0) {
            console.log('Primer registro:', JSON.stringify(data[0], null, 2));
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
