import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Configurar extensiones si es necesario (generalmente pgcrypto o uuid-ossp viene nativo en v13+ para gen_random_uuid)
  
  // 1. Empresas
  await db.schema
    .createTable('empresas')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.unique().notNull())
    .addColumn('direccion', 'text')
    .addColumn('telefono', 'text')
    .addColumn('email_contacto', 'text')
    .addColumn('licencia_ini', 'timestamp')
    .addColumn('licencia_fin', 'timestamp')
    .addColumn('estado', 'text', (col) => col.defaultTo('activo')) // activo, suspendido
    .addColumn('licencia_activa', 'boolean', (col) => col.defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // 2. Roles (Tenant Specific)
  await db.schema
    .createTable('roles')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('descripcion', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // 3. Permisos (System Wide)
  await db.schema
    .createTable('permisos')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('clave', 'text', (col) => col.notNull().unique())
    .addColumn('descripcion', 'text')
    .execute()

  // 4. Permisos_Rol
  await db.schema
    .createTable('permisos_rol')
    .addColumn('rol_id', 'uuid', (col) => col.notNull().references('roles.id').onDelete('cascade'))
    .addColumn('permiso_id', 'integer', (col) => col.notNull().references('permisos.id').onDelete('cascade'))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade')) // Redundancia útil
    .addPrimaryKeyConstraint('pk_permisos_rol', ['rol_id', 'permiso_id'])
    .execute()

  // 5. Usuarios
  await db.schema
    .createTable('usuarios')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('email', 'text', (col) => col.notNull().unique()) // Email único globalmente para login simple
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('rol_id', 'uuid', (col) => col.references('roles.id').onDelete('set null'))
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

    // Sesiones (Opcional, pero soporta la lógica actual si se decide usar)
    await db.schema
    .createTable('sesiones')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('token', 'text', (col) => col.notNull().unique())
    .addColumn('usuario_id', 'uuid', (col) => col.notNull().references('usuarios.id').onDelete('cascade'))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .execute()

  // 6. Salones
  await db.schema
    .createTable('salones')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // 7. Mesas
  await db.schema
    .createTable('mesas')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('salon_id', 'uuid', (col) => col.notNull().references('salones.id').onDelete('cascade'))
    .addColumn('numero', 'text', (col) => col.notNull())
    .addColumn('capacidad', 'integer', (col) => col.defaultTo(4))
    .addColumn('x', 'integer')
    .addColumn('y', 'integer')
    .addColumn('width', 'integer')
    .addColumn('height', 'integer')
    .addColumn('tipo', 'text', (col) => col.defaultTo('rect'))
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // 8. Categorias Productos
  await db.schema
    .createTable('categorias_productos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('orden', 'integer', (col) => col.defaultTo(0))
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .execute()

  // 9. Productos
  await db.schema
    .createTable('productos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('categoria_id', 'uuid', (col) => col.references('categorias_productos.id').onDelete('set null'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('descripcion', 'text')
    .addColumn('precio', 'integer', (col) => col.notNull())
    .addColumn('disponible', 'boolean', (col) => col.defaultTo(true))
    .addColumn('tiene_personalizacion', 'boolean', (col) => col.defaultTo(false))
    .addColumn('usa_inventario', 'boolean', (col) => col.defaultTo(false))
    .addColumn('stock', 'integer', (col) => col.defaultTo(0))
    .addColumn('costo', 'integer', (col) => col.defaultTo(0))
    .addColumn('imagen_url', 'text')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute()

  // 10. Insumos
  await db.schema
    .createTable('insumos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('unidad_medida', 'text', (col) => col.notNull())
    .addColumn('stock_actual', 'decimal', (col) => col.defaultTo(0))
    .addColumn('stock_minimo', 'decimal', (col) => col.defaultTo(0))
    .addColumn('costo_unitario', 'integer', (col) => col.defaultTo(0))
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .execute()

  // 11. Producto_Insumos
  await db.schema
    .createTable('producto_insumos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('producto_id', 'uuid', (col) => col.notNull().references('productos.id').onDelete('cascade'))
    .addColumn('insumo_id', 'uuid', (col) => col.notNull().references('insumos.id').onDelete('cascade'))
    .addColumn('cantidad', 'decimal', (col) => col.notNull())
    .execute()

  // 12. Comandas
  await db.schema
    .createTable('comandas')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('usuario_id', 'uuid', (col) => col.references('usuarios.id').onDelete('set null'))
    .addColumn('cliente_nombre', 'text')
    .addColumn('datos_cliente', 'jsonb')
    .addColumn('tipo_pedido', 'text') // mesa, domicilio
    .addColumn('estado', 'text', (col) => col.defaultTo('pendiente'))
    .addColumn('subtotal', 'integer', (col) => col.defaultTo(0))
    .addColumn('total', 'integer', (col) => col.defaultTo(0))
    .addColumn('monto_pagado', 'integer')
    .addColumn('cambio', 'integer')
    .addColumn('metodo_pago', 'text')
    .addColumn('observaciones', 'text')
    .addColumn('fecha_apertura', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('fecha_cierre', 'timestamp')
    .execute()

  // 13. Comanda Items
  await db.schema
    .createTable('comanda_items')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('comanda_id', 'uuid', (col) => col.notNull().references('comandas.id').onDelete('cascade'))
    .addColumn('producto_id', 'uuid', (col) => col.references('productos.id').onDelete('set null'))
    .addColumn('cantidad', 'integer', (col) => col.notNull())
    .addColumn('precio_unitario', 'integer', (col) => col.notNull())
    .addColumn('total', 'integer', (col) => col.notNull())
    .addColumn('observaciones', 'text')
    .addColumn('personalizacion', 'jsonb')
    .execute()
    
  // 14. Comanda Mesas (Relación N:M)
  await db.schema
    .createTable('comanda_mesas')
    .addColumn('comanda_id', 'uuid', (col) => col.notNull().references('comandas.id').onDelete('cascade'))
    .addColumn('mesa_id', 'uuid', (col) => col.notNull().references('mesas.id').onDelete('cascade'))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addPrimaryKeyConstraint('pk_comanda_mesas', ['comanda_id', 'mesa_id'])
    .execute()

  // 15. Facturas
  await db.schema
    .createTable('facturas')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('comanda_id', 'uuid', (col) => col.notNull().references('comandas.id'))
    .addColumn('cliente_nombre', 'text')
    .addColumn('cliente_rut', 'text')
    .addColumn('monto_total', 'integer', (col) => col.notNull())
    .addColumn('fecha_emision', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('url_pdf', 'text')
    .execute()
    
  // 16. Configuración Facturación
  await db.schema
    .createTable('config_facturacion')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('razon_social', 'text', (col) => col.notNull())
    .addColumn('rut', 'text', (col) => col.notNull())
    .addColumn('direccion', 'text', (col) => col.notNull())
    .addColumn('giro', 'text')
    .addColumn('telefono', 'text')
    .addColumn('email', 'text')
    .addColumn('logo_url', 'text')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .execute()
    
  // 17. Proveedores
  await db.schema
    .createTable('proveedores')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('rut', 'text')
    .addColumn('contacto', 'text')
    .addColumn('telefono', 'text')
    .addColumn('email', 'text')
    .execute()

  // 18. Personalizacion (Categorias)
  await db.schema
    .createTable('categorias_personalizacion')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('multi_seleccion', 'boolean', (col) => col.defaultTo(false))
    .addColumn('obligatorio', 'boolean', (col) => col.defaultTo(false))
    .execute()

  // 19. Items Personalizacion
  await db.schema
    .createTable('items_personalizacion')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('categoria_id', 'uuid', (col) => col.notNull().references('categorias_personalizacion.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('precio_extra', 'integer', (col) => col.defaultTo(0))
    .execute()

  // 20. Personalizacion Insumos
  await db.schema
    .createTable('personalizacion_insumos')
    .addColumn('item_personalizacion_id', 'uuid', (col) => col.notNull().references('items_personalizacion.id').onDelete('cascade'))
    .addColumn('insumo_id', 'uuid', (col) => col.notNull().references('insumos.id').onDelete('cascade'))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('cantidad', 'decimal', (col) => col.notNull())
    .addPrimaryKeyConstraint('pk_pers_insumos', ['item_personalizacion_id', 'insumo_id'])
    .execute()

  // 21. Empleados
  await db.schema
    .createTable('empleados')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('nombre', 'text', (col) => col.notNull())
    .addColumn('rut', 'text')
    .addColumn('cargo', 'text')
    .addColumn('sueldo_base', 'integer', (col) => col.defaultTo(0))
    .addColumn('fecha_ingreso', 'timestamp')
    .addColumn('activo', 'boolean', (col) => col.defaultTo(true))
    .execute()
    
  // 22. Nominas
  await db.schema
    .createTable('nominas')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('empleado_id', 'uuid', (col) => col.notNull().references('empleados.id').onDelete('cascade'))
    .addColumn('fecha', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .addColumn('mes', 'integer', (col) => col.notNull())
    .addColumn('anio', 'integer', (col) => col.notNull())
    .addColumn('monto_total', 'integer', (col) => col.defaultTo(0))
    .addColumn('estado', 'text', (col) => col.defaultTo('borrador')) // borrador, pagado
    .execute()

  // 23. Nomina Detalles
  await db.schema
    .createTable('nomina_detalles')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('nomina_id', 'uuid', (col) => col.notNull().references('nominas.id').onDelete('cascade'))
    .addColumn('tipo', 'text', (col) => col.notNull()) // bono, descuento, base
    .addColumn('descripcion', 'text', (col) => col.notNull())
    .addColumn('monto', 'integer', (col) => col.notNull())
    .execute()

  // 24. Contratos
  await db.schema
    .createTable('contratos')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('empleado_id', 'uuid', (col) => col.notNull().references('empleados.id').onDelete('cascade'))
    .addColumn('tipo_contrato', 'text', (col) => col.notNull())
    .addColumn('fecha_inicio', 'timestamp', (col) => col.notNull())
    .addColumn('fecha_fin', 'timestamp')
    .addColumn('detalles', 'jsonb')
    .execute()

  // 25. Configuración General Sistema (Key-Value por tenant)
  await db.schema
    .createTable('config_sistema')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
    .addColumn('clave', 'text', (col) => col.notNull())
    .addColumn('valor', 'jsonb', (col) => col.notNull())
    .addUniqueConstraint('uk_config_empresa_clave', ['empresa_id', 'clave'])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order
  await db.schema.dropTable('config_sistema').execute()
  await db.schema.dropTable('contratos').execute()
  await db.schema.dropTable('nomina_detalles').execute()
  await db.schema.dropTable('nominas').execute()
  await db.schema.dropTable('empleados').execute()
  await db.schema.dropTable('personalizacion_insumos').execute()
  await db.schema.dropTable('items_personalizacion').execute()
  await db.schema.dropTable('categorias_personalizacion').execute()
  await db.schema.dropTable('proveedores').execute()
  await db.schema.dropTable('config_facturacion').execute()
  await db.schema.dropTable('facturas').execute()
  await db.schema.dropTable('comanda_mesas').execute()
  await db.schema.dropTable('comanda_items').execute()
  await db.schema.dropTable('comandas').execute()
  await db.schema.dropTable('producto_insumos').execute()
  await db.schema.dropTable('insumos').execute()
  await db.schema.dropTable('productos').execute()
  await db.schema.dropTable('categorias_productos').execute()
  await db.schema.dropTable('mesas').execute()
  await db.schema.dropTable('salones').execute()
  await db.schema.dropTable('sesiones').execute()
  await db.schema.dropTable('usuarios').execute()
  await db.schema.dropTable('permisos_rol').execute()
  await db.schema.dropTable('permisos').execute()
  await db.schema.dropTable('roles').execute()
  await db.schema.dropTable('empresas').execute()
}
