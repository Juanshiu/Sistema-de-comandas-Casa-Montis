/**
 * Migración 018: Sistema SaaS Admin
 * FASE 2.1 - Consolidación SaaS
 * 
 * Crea las estructuras necesarias para el Panel Master Admin:
 * - Tabla licencias
 * - Columna is_super_admin en usuarios
 * - Campos adicionales en empresas
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('🔄 Ejecutando migración 018: SaaS Admin System...');

  // 1. Crear tabla de licencias
  await db.schema
    .createTable('licencias')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => 
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('empresa_id', 'uuid', (col) => 
      col.references('empresas.id').onDelete('cascade').notNull()
    )
    .addColumn('plan', 'varchar(50)', (col) => col.notNull().defaultTo('basico'))
    .addColumn('fecha_inicio', 'timestamp', (col) => col.notNull())
    .addColumn('fecha_fin', 'timestamp')
    .addColumn('estado', 'varchar(20)', (col) => col.notNull().defaultTo('activo'))
    .addColumn('max_usuarios', 'integer', (col) => col.defaultTo(5))
    .addColumn('max_mesas', 'integer', (col) => col.defaultTo(20))
    .addColumn('features', 'jsonb', (col) => col.defaultTo(sql`'{}'::jsonb`))
    .addColumn('notas', 'text')
    .addColumn('created_at', 'timestamp', (col) => 
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('updated_at', 'timestamp', (col) => 
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  console.log('   ✓ Tabla licencias creada');

  // 2. Agregar columna is_super_admin a usuarios (si no existe)
  try {
    await db.schema
      .alterTable('usuarios')
      .addColumn('is_super_admin', 'boolean', (col) => col.defaultTo(false))
      .execute();
    console.log('   ✓ Columna is_super_admin agregada a usuarios');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('   ⚠ Columna is_super_admin ya existe');
    } else {
      throw e;
    }
  }

  // 3. Crear índices
  await db.schema
    .createIndex('idx_licencias_empresa')
    .ifNotExists()
    .on('licencias')
    .column('empresa_id')
    .execute();

  await db.schema
    .createIndex('idx_licencias_estado')
    .ifNotExists()
    .on('licencias')
    .column('estado')
    .execute();

  console.log('   ✓ Índices creados');

  // 4. Agregar campos adicionales a empresas para mejor gestión
  try {
    await db.schema
      .alterTable('empresas')
      .addColumn('plan_actual', 'varchar(50)', (col) => col.defaultTo('basico'))
      .execute();
    console.log('   ✓ Campo plan_actual agregado a empresas');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
  }

  try {
    await db.schema
      .alterTable('empresas')
      .addColumn('max_usuarios', 'integer', (col) => col.defaultTo(5))
      .execute();
    console.log('   ✓ Campo max_usuarios agregado a empresas');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
  }

  try {
    await db.schema
      .alterTable('empresas')
      .addColumn('origen', 'varchar(50)', (col) => col.defaultTo('manual'))
      .execute();
    console.log('   ✓ Campo origen agregado a empresas');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
  }

  console.log('✅ Migración 018 SaaS Admin completada');
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('🔄 Revirtiendo migración 018: SaaS Admin System...');

  await db.schema.dropTable('licencias').ifExists().execute();
  
  // No revertimos las columnas de usuarios/empresas para evitar pérdida de datos

  console.log('✅ Reversión completada');
}
