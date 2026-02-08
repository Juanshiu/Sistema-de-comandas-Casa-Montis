/**
 * Migration 021 - Sistema de Auditoría SaaS y Mejoras de Licencias
 * FASE 2.3 - Panel Master Admin Avanzado
 * 
 * Crea:
 * - Tabla auditoria_saas para logging de acciones del master admin
 * - Campos adicionales en licencias para pausar/moroso
 * - Campo ultimo_login en usuarios
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('🔄 Ejecutando migración 021: Sistema Auditoría SaaS...');

  // 1. Crear tabla de auditoría SaaS
  console.log('   → Creando tabla auditoria_saas...');
  await db.schema
    .createTable('auditoria_saas')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('accion', 'text', (col) => col.notNull())
    .addColumn('empresa_id', 'uuid', (col) => col.references('empresas.id').onDelete('set null'))
    .addColumn('usuario_afectado_id', 'uuid', (col) => col.references('usuarios.id').onDelete('set null'))
    .addColumn('detalles', 'jsonb', (col) => col.notNull().defaultTo('{}'))
    .addColumn('admin_id', 'uuid', (col) => col.notNull())
    .addColumn('admin_email', 'text', (col) => col.notNull())
    .addColumn('ip_address', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Índices para auditoria
  await db.schema
    .createIndex('idx_auditoria_empresa')
    .ifNotExists()
    .on('auditoria_saas')
    .column('empresa_id')
    .execute();

  await db.schema
    .createIndex('idx_auditoria_accion')
    .ifNotExists()
    .on('auditoria_saas')
    .column('accion')
    .execute();

  await db.schema
    .createIndex('idx_auditoria_fecha')
    .ifNotExists()
    .on('auditoria_saas')
    .column('created_at')
    .execute();

  console.log('   ✓ Tabla auditoria_saas creada');

  // 2. Agregar campos a licencias para estados avanzados
  console.log('   → Agregando campos a licencias...');
  
  try {
    await db.schema
      .alterTable('licencias')
      .addColumn('fecha_pausa', 'timestamp')
      .execute();
    console.log('   ✓ Campo fecha_pausa agregado');
  } catch (e) {
    console.log('   ⚠ Campo fecha_pausa ya existe');
  }

  try {
    await db.schema
      .alterTable('licencias')
      .addColumn('dias_pausados', 'integer', (col) => col.defaultTo(0))
      .execute();
    console.log('   ✓ Campo dias_pausados agregado');
  } catch (e) {
    console.log('   ⚠ Campo dias_pausados ya existe');
  }

  try {
    await db.schema
      .alterTable('licencias')
      .addColumn('motivo_cambio', 'text')
      .execute();
    console.log('   ✓ Campo motivo_cambio agregado');
  } catch (e) {
    console.log('   ⚠ Campo motivo_cambio ya existe');
  }

  // 3. Agregar ultimo_login a usuarios
  console.log('   → Agregando ultimo_login a usuarios...');
  try {
    await db.schema
      .alterTable('usuarios')
      .addColumn('ultimo_login', 'timestamp')
      .execute();
    console.log('   ✓ Campo ultimo_login agregado');
  } catch (e) {
    console.log('   ⚠ Campo ultimo_login ya existe');
  }

  // 4. Agregar campo bloqueado a usuarios (para bloquear solo admin sin suspender empresa)
  console.log('   → Agregando campo bloqueado a usuarios...');
  try {
    await db.schema
      .alterTable('usuarios')
      .addColumn('bloqueado', 'boolean', (col) => col.defaultTo(false))
      .execute();
    console.log('   ✓ Campo bloqueado agregado');
  } catch (e) {
    console.log('   ⚠ Campo bloqueado ya existe');
  }

  console.log('✅ Migración 021 completada');
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('🔄 Revirtiendo migración 021...');
  
  await db.schema.dropTable('auditoria_saas').ifExists().execute();
  
  // No eliminamos columnas en down para evitar pérdida de datos
  console.log('✅ Migración 021 revertida');
}
