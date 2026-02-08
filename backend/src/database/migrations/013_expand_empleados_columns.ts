import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 1. Rename columns that changed but represent same data (if applicable)
    // or just drop and recreate if data loss is acceptable in this stage.
    // Given it's a migration, let's try to preserve data by adding new and dropping old.
    
    await db.schema
        .alterTable('empleados')
        .addColumn('tipo_documento', 'text')
        .addColumn('numero_documento', 'text')
        .addColumn('nombres', 'text')
        .addColumn('apellidos', 'text')
        .addColumn('direccion', 'text')
        .addColumn('municipio', 'text')
        .addColumn('celular', 'text')
        .addColumn('email', 'text')
        .addColumn('tipo_contrato', 'text')
        .addColumn('fecha_inicio', 'timestamp')
        .addColumn('fecha_fin', 'timestamp')
        .addColumn('tipo_trabajador', 'text', (col) => col.defaultTo('DEPENDIENTE'))
        .addColumn('subtipo_trabajador', 'text')
        .addColumn('alto_riesgo', 'boolean', (col) => col.defaultTo(false))
        .addColumn('salario_integral', 'boolean', (col) => col.defaultTo(false))
        .addColumn('frecuencia_pago', 'text', (col) => col.defaultTo('MENSUAL'))
        .addColumn('salario_base', 'decimal', (col) => col.defaultTo(0))
        .addColumn('auxilio_transporte', 'boolean', (col) => col.defaultTo(true))
        .addColumn('metodo_pago', 'text')
        .addColumn('banco', 'text')
        .addColumn('tipo_cuenta', 'text')
        .addColumn('numero_cuenta', 'text')
        .addColumn('estado', 'text', (col) => col.defaultTo('ACTIVO'))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    // Migrar datos de 'nombre' a 'nombres' y 'rut' a 'numero_documento'
    await sql`UPDATE empleados SET nombres = nombre, numero_documento = rut, salario_base = sueldo_base`.execute(db);

    // Eliminar columnas antiguas
    await db.schema.alterTable('empleados').dropColumn('nombre').execute();
    await db.schema.alterTable('empleados').dropColumn('rut').execute();
    await db.schema.alterTable('empleados').dropColumn('sueldo_base').execute();
    await db.schema.alterTable('empleados').dropColumn('fecha_ingreso').execute();
    await db.schema.alterTable('empleados').dropColumn('activo').execute();

    // Agregar indice unico para numero_documento por empresa
    await sql`CREATE UNIQUE INDEX idx_empleados_doc_empresa ON empleados (empresa_id, numero_documento)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('empleados')
        .addColumn('nombre', 'text')
        .addColumn('rut', 'text')
        .addColumn('sueldo_base', 'decimal', (col) => col.defaultTo(0))
        .addColumn('fecha_ingreso', 'timestamp')
        .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
        .execute();

    await sql`UPDATE empleados SET nombre = nombres, rut = numero_documento, sueldo_base = salario_base`.execute(db);

    await db.schema.alterTable('empleados').dropColumn('tipo_documento').execute();
    await db.schema.alterTable('empleados').dropColumn('numero_documento').execute();
    await db.schema.alterTable('empleados').dropColumn('nombres').execute();
    await db.schema.alterTable('empleados').dropColumn('apellidos').execute();
    await db.schema.alterTable('empleados').dropColumn('direccion').execute();
    await db.schema.alterTable('empleados').dropColumn('municipio').execute();
    await db.schema.alterTable('empleados').dropColumn('celular').execute();
    await db.schema.alterTable('empleados').dropColumn('email').execute();
    await db.schema.alterTable('empleados').dropColumn('tipo_contrato').execute();
    await db.schema.alterTable('empleados').dropColumn('fecha_inicio').execute();
    await db.schema.alterTable('empleados').dropColumn('fecha_fin').execute();
    await db.schema.alterTable('empleados').dropColumn('tipo_trabajador').execute();
    await db.schema.alterTable('empleados').dropColumn('subtipo_trabajador').execute();
    await db.schema.alterTable('empleados').dropColumn('alto_riesgo').execute();
    await db.schema.alterTable('empleados').dropColumn('salario_integral').execute();
    await db.schema.alterTable('empleados').dropColumn('frecuencia_pago').execute();
    await db.schema.alterTable('empleados').dropColumn('salario_base').execute();
    await db.schema.alterTable('empleados').dropColumn('auxilio_transporte').execute();
    await db.schema.alterTable('empleados').dropColumn('metodo_pago').execute();
    await db.schema.alterTable('empleados').dropColumn('banco').execute();
    await db.schema.alterTable('empleados').dropColumn('tipo_cuenta').execute();
    await db.schema.alterTable('empleados').dropColumn('numero_cuenta').execute();
    await db.schema.alterTable('empleados').dropColumn('estado').execute();
    await db.schema.alterTable('empleados').dropColumn('created_at').execute();
    await db.schema.alterTable('empleados').dropColumn('updated_at').execute();
    
    await sql`DROP INDEX IF EXISTS idx_empleados_doc_empresa`.execute(db);
}
