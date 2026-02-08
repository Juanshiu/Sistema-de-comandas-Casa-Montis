import { db } from '../database/database';
import { sql } from 'kysely';

async function auditSchema() {
    console.log('🔍 Iniciando auditoría de esquema SaaS...');
    
    // Obtener todas las tablas de la base de datos (Postgres)
    const tablesResult = await sql<any>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `.execute(db);

    const tables = tablesResult.rows.map(r => r.table_name);
    const ignoreTables = ['empresas', 'migrations', 'knex_migrations', 'knex_migrations_lock'];

    const report = {
        total: tables.length,
        compliant: 0,
        missingColumn: [] as string[],
        missingIndex: [] as string[]
    };

    for (const table of tables) {
        if (ignoreTables.includes(table)) continue;

        // 1. Verificar columna empresa_id
        const columnResult = await sql<any>`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = ${table} 
            AND column_name = 'empresa_id'
        `.execute(db);

        if (columnResult.rows.length === 0) {
            report.missingColumn.push(table);
            continue;
        }

        // 2. Verificar índice sobre empresa_id
        // Buscamos si existe un índice donde la columna empresa_id sea la primera (o única)
        const indexResult = await sql<any>`
            SELECT i.relname as index_name
            FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
            WHERE t.oid = ix.indrelid
            AND i.oid = ix.indexrelid
            AND a.attrelid = t.oid
            AND a.attnum = ANY(ix.indkey)
            AND t.relkind = 'r'
            AND t.relname = ${table}
            AND a.attname = 'empresa_id'
        `.execute(db);

        if (indexResult.rows.length === 0) {
            report.missingIndex.push(table);
        } else {
            report.compliant++;
        }
    }

    console.log('\n--- REPORTE DE AUDITORÍA ---');
    console.log(`Tablas totales analizadas: ${report.total}`);
    console.log(`Tablas cumplidoras: ${report.compliant}`);
    
    if (report.missingColumn.length > 0) {
        console.error('\n❌ TABLAS SIN COLUMNA empresa_id (CRÍTICO):');
        report.missingColumn.forEach(t => console.error(` - ${t}`));
    }

    if (report.missingIndex.length > 0) {
        console.warn('\n⚠️ TABLAS SIN ÍNDICE EN empresa_id (RENDIMIENTO):');
        report.missingIndex.forEach(t => console.warn(` - ${t}`));
    }

    if (report.missingColumn.length === 0 && report.missingIndex.length === 0) {
        console.log('\n✅ Todas las tablas cumplen con el estándar SaaS.');
    }

    process.exit(0);
}

auditSchema().catch(err => {
    console.error('Error en auditoría:', err);
    process.exit(1);
});
