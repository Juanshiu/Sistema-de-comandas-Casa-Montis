/**
 * Script de Auditoría de Esquema Multi-Tenant
 * FASE 1.2 - Consolidación SaaS
 * 
 * Este script analiza todas las tablas de la base de datos y verifica:
 * - ¿Cuáles tienen columna empresa_id?
 * - ¿Cuáles deberían tenerla pero no la tienen?
 * - ¿Cuáles son tablas globales legítimas (no necesitan empresa_id)?
 * 
 * ✅ Solo lectura, no modifica datos
 * ✅ Genera reporte claro
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Tablas que legítimamente NO necesitan empresa_id (son globales del SaaS)
const TABLAS_GLOBALES = [
  'permisos',           // Catálogo de permisos del sistema (global)
  'licencias',          // Tabla nueva para SaaS admin
  'migrations',         // Control de migraciones
  'kysely_migration',   // Control de migraciones Kysely
  'kysely_migration_lock', // Lock de migraciones
];

// Tablas que DEBEN tener empresa_id (multi-tenant)
const TABLAS_MULTI_TENANT = [
  'usuarios',
  'empresas',  // id es la empresa, no empresa_id
  'roles',
  'permisos_rol',
  'salones',
  'mesas',
  'categorias_productos',
  'productos',
  'insumos',
  'producto_insumos',
  'historial_inventario',
  'comandas',
  'comanda_items',
  'comanda_mesas',
  'facturas',
  'config_facturacion',
  'proveedores',
  'categorias_personalizacion',
  'items_personalizacion',
  'personalizacion_insumos',
  'insumo_categorias',
  'insumo_historial',
  'empleados',
  'nominas',
  'nomina_detalles',
  'contratos',
  'config_sistema',
  'configuracion_nomina',
  'sesiones'
];

interface TableInfo {
  table_name: string;
  has_empresa_id: boolean;
  columns: string[];
}

interface AuditResult {
  correctas: TableInfo[];
  sospechosas: TableInfo[];
  globales: TableInfo[];
  no_esperadas: TableInfo[];
  resumen: string;
}

async function auditSchema(): Promise<void> {
  console.log('\n🔍 AUDITORÍA DE ESQUEMA MULTI-TENANT\n');
  console.log('═'.repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Obtener todas las tablas del schema public
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables: string[] = tablesResult.rows.map(r => r.table_name);

    console.log(`\n📊 Total de tablas encontradas: ${tables.length}\n`);

    const result: AuditResult = {
      correctas: [],
      sospechosas: [],
      globales: [],
      no_esperadas: [],
      resumen: ''
    };

    // 2. Analizar cada tabla
    for (const tableName of tables) {
      // Obtener columnas de la tabla
      const columnsResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const columns = columnsResult.rows.map(r => r.column_name);
      const hasEmpresaId = columns.includes('empresa_id');

      const tableInfo: TableInfo = {
        table_name: tableName,
        has_empresa_id: hasEmpresaId,
        columns
      };

      // Clasificar la tabla
      if (TABLAS_GLOBALES.includes(tableName)) {
        // Es una tabla global legítima
        result.globales.push(tableInfo);
      } else if (tableName === 'empresas') {
        // La tabla empresas es especial (id ES la empresa)
        result.correctas.push(tableInfo);
      } else if (TABLAS_MULTI_TENANT.includes(tableName)) {
        if (hasEmpresaId) {
          result.correctas.push(tableInfo);
        } else {
          result.sospechosas.push(tableInfo);
        }
      } else {
        // Tabla no esperada - podría ser nueva o legacy
        if (!hasEmpresaId) {
          result.sospechosas.push(tableInfo);
        } else {
          result.no_esperadas.push(tableInfo);
        }
      }
    }

    // 3. Imprimir resultados
    console.log('✅ TABLAS CORRECTAS (con empresa_id o legítimamente globales):');
    console.log('-'.repeat(60));
    for (const t of result.correctas) {
      console.log(`   ✓ ${t.table_name}`);
    }
    console.log(`\n   Total: ${result.correctas.length}\n`);

    console.log('🌐 TABLAS GLOBALES (no requieren empresa_id):');
    console.log('-'.repeat(60));
    for (const t of result.globales) {
      console.log(`   ○ ${t.table_name}`);
    }
    console.log(`\n   Total: ${result.globales.length}\n`);

    if (result.sospechosas.length > 0) {
      console.log('⚠️  TABLAS SOSPECHOSAS (deberían tener empresa_id):');
      console.log('-'.repeat(60));
      for (const t of result.sospechosas) {
        console.log(`   ⚠ ${t.table_name}`);
        console.log(`      Columnas: ${t.columns.join(', ')}`);
      }
      console.log(`\n   Total: ${result.sospechosas.length}\n`);
    }

    if (result.no_esperadas.length > 0) {
      console.log('❓ TABLAS NO ESPERADAS (revisar manualmente):');
      console.log('-'.repeat(60));
      for (const t of result.no_esperadas) {
        console.log(`   ? ${t.table_name} ${t.has_empresa_id ? '(tiene empresa_id)' : ''}`);
      }
      console.log(`\n   Total: ${result.no_esperadas.length}\n`);
    }

    // 4. Resumen
    console.log('═'.repeat(60));
    console.log('📋 RESUMEN DE AUDITORÍA');
    console.log('═'.repeat(60));
    console.log(`   ✅ Correctas:    ${result.correctas.length}`);
    console.log(`   🌐 Globales:     ${result.globales.length}`);
    console.log(`   ⚠️  Sospechosas:  ${result.sospechosas.length}`);
    console.log(`   ❓ No esperadas: ${result.no_esperadas.length}`);
    console.log('');

    if (result.sospechosas.length === 0) {
      console.log('🎉 ¡Excelente! El esquema cumple con el patrón multi-tenant.');
    } else {
      console.log('⚠️  Se encontraron tablas que podrían necesitar empresa_id.');
      console.log('   Revisar manualmente antes de continuar.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
auditSchema();
