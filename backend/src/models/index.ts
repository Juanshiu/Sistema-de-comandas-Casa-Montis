export interface Mesa {
  id: number;
  numero: string;
  capacidad: number;
  salon: string;
  ocupada: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  tiene_personalizacion?: boolean;
  personalizaciones_habilitadas?: string | string[];
  usa_inventario?: boolean;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface DatosCliente {
  nombre: string;
  direccion: string;
  telefono?: string;
  es_para_llevar: boolean;
}

export interface Comanda {
  id: string;
  mesas: Mesa[];
  mesero: string; // DEPRECATED: Se mantiene por compatibilidad, usar usuario_nombre
  usuario_id?: number; // ID del usuario que creó la comanda
  usuario_nombre?: string; // Nombre del usuario que creó la comanda
  subtotal: number;
  total: number;
  estado: 'pendiente' | 'preparando' | 'lista' | 'entregada' | 'cancelada';
  observaciones_generales?: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  items?: ComandaItem[];
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  monto_pagado?: number;
  cambio?: number;
}

export interface ComandaItem {
  id: string;
  comanda_id: string;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  personalizacion?: any;
  created_at?: Date;
  producto?: Producto;
}

export interface CreateComandaRequest {
  mesas?: Mesa[];
  items: {
    producto: Producto;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    observaciones?: string;
    personalizacion?: any;
  }[];
  subtotal: number;
  total: number;
  mesero: string;
  observaciones_generales?: string;
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
}

// ==================== USUARIOS Y ROLES ====================

export interface Usuario {
  id: number;
  usuario: string; // email o username
  password_hash?: string; // No se expone al frontend
  nombre_completo: string;
  rol_id: number;
  pin?: string;
  telefono?: string;
  activo: boolean;
  ultimo_login?: Date;
  created_at?: Date;
  updated_at?: Date;
  // Datos adicionales del JOIN
  rol_nombre?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  es_superusuario: boolean;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
  // Datos adicionales
  cantidad_usuarios?: number;
}

export interface PermisoRol {
  id: number;
  rol_id: number;
  permiso: string;
  activo: boolean;
  created_at?: Date;
}

export interface Sesion {
  id: number;
  usuario_id: number;
  token: string;
  fecha_creacion: Date;
  fecha_expiracion: Date;
  activo: boolean;
}

export interface LoginRequest {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSesion;
  permisos: string[];
}

export interface UsuarioSesion {
  id: number;
  usuario: string;
  nombre_completo: string;
  rol_id: number;
  rol_nombre: string;
  es_superusuario: boolean;
}

// ==================== NÓMINA ====================

export interface Empleado {
  id: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  direccion?: string;
  municipio?: string;
  celular?: string;
  email?: string;
  
  cargo: string;
  tipo_contrato: 'TERMINO_FIJO' | 'INDEFINIDO' | 'OBRA_LABOR' | 'APRENDIZAJE';
  fecha_inicio: Date | string;
  fecha_fin?: Date | string;
  
  tipo_trabajador: 'DEPENDIENTE' | 'INDEPENDIENTE';
  subtipo_trabajador?: string;
  alto_riesgo: boolean;
  salario_integral: boolean;
  
  frecuencia_pago: 'MENSUAL' | 'QUINCENAL';
  salario_base: number;
  auxilio_transporte: boolean;
  
  es_periodo_prueba?: boolean;
  fecha_fin_periodo_prueba?: Date | string;
  
  metodo_pago?: 'EFECTIVO' | 'TRANSFERENCIA';
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  
  estado: 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'LICENCIA';
  
  created_at?: Date;
  updated_at?: Date;
}

export interface ConfiguracionNomina {
  id: number;
  anio: number;
  salario_minimo: number;
  auxilio_transporte: number;
  uvt: number;
  
  porc_salud_empleado: number;
  porc_pension_empleado: number;
  fondo_solidaridad_limite: number;
  
  porc_salud_empleador: number;
  porc_pension_empleador: number;
  porc_caja_comp: number;
  porc_sena: number;
  porc_icbf: number;
  
  porc_cesantias: number;
  porc_intereses_cesantias: number;
  porc_prima: number;
  porc_vacaciones: number;
  
  // Recargos y Extras
  porc_recargo_dominical: number;
  porc_recargo_festivo: number;
  porc_recargo_diurno: number;
  porc_extra_diurna_dominical: number;
  horas_mensuales: number;
  
  vigente: boolean;
}

export interface Nomina {
  id: number;
  periodo_inicio: Date | string;
  periodo_fin: Date | string;
  tipo: 'NOMINA' | 'PRIMA' | 'VACACIONES';
  estado: 'BORRADOR' | 'APROBADA' | 'PAGADA';
  
  total_devengado: number;
  total_deducciones: number;
  total_pagado: number;
  
  observaciones?: string;
  detalles?: NominaDetalle[];
  created_at?: Date;
}

export interface NominaDetalle {
  id: number;
  nomina_id: number;
  empleado_id: number;
  empleado?: Empleado; // Join
  
  dias_trabajados: number;
  sueldo_basico: number;
  auxilio_transporte: number;
  horas_extras: number;
  recargos: number;
  comisiones: number;
  otros_devengados: number;
  
  // Campos detallados para recargos dom/fest
  horas_dominicales_diurnas?: number;
  horas_festivas_diurnas?: number;
  horas_extra_diurna_dominical?: number;
  valor_dominicales_diurnas?: number;
  valor_festivas_diurnas?: number;
  valor_extra_diurna_dominical?: number;
  horas_diurnas?: number;
  valor_diurnas?: number;

  total_devengado: number;
  
  salud_empleado: number;
  pension_empleado: number;
  fondo_solidaridad: number;
  prestamos: number;
  otras_deducciones: number;
  total_deducciones: number;
  
  neto_pagado: number;
  valores_empresa?: string; // JSON string
  
  created_at?: Date;
  periodo_mes?: string;
  periodo_anio?: number;
  fecha_generacion?: Date;
  usuario_nombre?: string;

  // Campos adicionales de gestión
  version?: number;
  estado?: 'ABIERTA' | 'AJUSTADA' | 'PAGADA';
  pdf_version?: number;
  pdf_path?: string;
}

export interface Liquidacion {
  id: number;
  empleado_id: number;
  empleado?: Empleado;
  
  fecha_liquidacion: Date | string;
  fecha_inicio_contrato: Date | string;
  fecha_fin_contrato: Date | string;
  motivo_retiro?: string;
  
  dias_laborados_total: number;
  dias_liquidar_cesantias: number;
  dias_liquidar_vacaciones: number;
  base_liquidacion: number;
  
  cesantias: number;
  intereses_cesantias: number;
  prima_servicios: number;
  vacaciones: number;
  indemnizacion: number;
  
  total_liquidacion: number;
  estado: 'BORRADOR' | 'PAGADA';
  
  observaciones?: string;
  created_at?: Date;
}

export interface PagoNomina {
  id: number;
  nomina_detalle_id: number;
  empleado_id?: number;
  valor: number;
  tipo: 'QUINCENA' | 'AJUSTE' | 'COMPLEMENTO';
  fecha_pago: Date | string;
  fecha?: Date | string; // Alias para compatibilidad
  observaciones?: string;
  usuario_nombre?: string;
  created_at?: Date;
}

export interface HistorialNomina {
  id: number;
  nomina_detalle_id: number;
  version?: number;
  fecha: Date | string;
  accion?: string;
  cambio_realizado?: string;
  descripcion?: string;
  usuario_nombre?: string;
  created_at?: Date;
}

