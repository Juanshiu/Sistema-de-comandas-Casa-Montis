export interface Mesa {
  id: number;
  numero: string;
  capacidad: number;
  salon: string;
  salon_id?: number;
  ocupada: boolean;
}

export interface Salon {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string; // Cambiado de CategoriaProducto a string para permitir categorías dinámicas
  disponible: boolean;
  descripcion?: string;
  tiene_personalizacion?: boolean;
  personalizaciones_habilitadas?: string[]; // Array de nombres de categorías de personalización
  usa_inventario?: boolean;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
}

export type CategoriaProducto = 
  | 'desayuno'
  | 'almuerzo'
  | 'almuerzo_especial'
  | 'carta_pechuga'
  | 'carta_carne'
  | 'carta_pasta'
  | 'carta_pescado'
  | 'carta_arroz'
  | 'sopa'
  | 'bebida'
  | 'otros'
  | 'cafeteria'
  | 'porciones';

export interface ItemComanda {
  id: string;
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  personalizacion?: PersonalizacionItem;
  personalizacion_pendiente?: boolean; // Indica que el producto requiere personalización pero aún no se ha configurado
}

export interface ItemPersonalizacion {
  id: number;
  categoria_id: number;
  nombre: string;
  descripcion?: string;
  precio_adicional: number;
  activo: boolean;
  disponible?: number | boolean;
  usa_inventario?: boolean | number;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
}

export interface PersonalizacionItem {
  // Sistema dinámico de personalizaciones
  // Las propiedades se crean dinámicamente según las categorías configuradas
  precio_adicional?: number;
  [key: string]: any; // Permite cualquier categoría de personalización
}

export interface CategoriaPersonalizacion {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
}

export interface DatosCliente {
  nombre: string;
  direccion: string;
  telefono?: string;
  es_para_llevar: boolean; // true = cliente recoge, false = domicilio
}

export interface Comanda {
  id: string;
  mesas: Mesa[];
  items: ItemComanda[];
  subtotal: number;
  total: number;
  estado: EstadoComanda;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  mesero: string; // DEPRECATED: se mantiene por compatibilidad
  usuario_id?: number;
  usuario_nombre?: string; // Nombre del usuario que creó la comanda
  observaciones_generales?: string;
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
}

export type EstadoComanda = 'pendiente' | 'preparando' | 'lista' | 'entregada' | 'cancelada' | 'facturada';

export interface Factura {
  id: string;
  comanda_id: string;
  mesas: Mesa[];
  items: ItemComanda[];
  subtotal: number;
  total: number;
  fecha_creacion: Date;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  cajero: string;
  monto_pagado?: number;
  cambio?: number;
}

export interface ReporteVentas {
  fecha: string;
  total_ventas: number;
  cantidad_comandas: number;
  promedio_por_comanda: number;
  productos_mas_vendidos: ProductoVendido[];
  ventas_por_hora: VentaPorHora[];
  comparativas?: Comparativas;
  metodos_pago?: MetodoPago[];
  alertas?: string[];
}

export interface Comparativas {
  vs_dia_anterior: ComparativaDetalle;
  vs_semana_anterior: ComparativaDetalle;
  vs_promedio_semanal: ComparativaDetalle;
}

export interface ComparativaDetalle {
  ventas: number;
  ventas_porcentaje: number;
  comandas: number;
  comandas_porcentaje: number;
}

export interface MetodoPago {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  cantidad: number;
  total: number;
  porcentaje: number;
  comision_estimada?: number;
}

export interface ProductoVendido {
  producto: Producto;
  cantidad_vendida: number;
  total_vendido: number;
}

export interface VentaPorHora {
  hora: string;
  ventas: number;
  comandas: number;
  es_pico?: boolean;
  es_muerta?: boolean;
}

export interface PasoComanda {
  paso: number;
  titulo: string;
  completado: boolean;
}

export interface FormularioComanda {
  mesas: Mesa[];
  tipo_servicio?: string;
  items: ItemComanda[];
  observaciones_generales?: string;
  mesero?: string; // DEPRECATED
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
}

export interface ComandaHistorial {
  id: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  mesero: string; // DEPRECATED
  usuario_nombre?: string; // Nombre del usuario que creó la comanda
  subtotal: number;
  total: number;
  estado: string;
  observaciones_generales?: string;
  mesas: Mesa[];
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
  items: ItemComandaHistorial[];
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  monto_pagado?: number;
  cambio?: number;
}

export interface ItemComandaHistorial {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  producto?: {
    id: number;
    nombre: string;
    precio: number;
    categoria: string;
    disponible: boolean;
  };
  personalizacion?: PersonalizacionItem;
}

// ==================== AUTENTICACIÓN Y ROLES ====================

export interface Usuario {
  id: number;
  usuario: string; // email o username
  nombre_completo: string;
  rol_id: number;
  pin?: string;
  telefono?: string;
  activo: boolean;
  ultimo_login?: Date;
  created_at?: Date;
  updated_at?: Date;
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
  cantidad_usuarios?: number;
  permisos?: PermisoRol[];
}

export interface PermisoRol {
  id?: number;
  permiso: string;
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


export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
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
  empleado?: Empleado;
  
  dias_trabajados: number;
  sueldo_basico: number;
  auxilio_transporte: number;
  horas_diurnas?: number;
  valor_diurnas?: number;
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
  dias_liquidar_prima: number;
  base_liquidacion: number;
  
  cesantias: number;
  intereses_cesantias: number;
  prima_servicios: number;
  vacaciones: number;
  indemnizacion: number;
  
  tipo_contrato: string;
  tipo_terminacion: string;
  salario_fijo: boolean;
  base_calculo_detalle?: string; // JSON con detalles de promedios
  
  total_liquidacion: number;
  estado: 'BORRADOR' | 'PAGADA';
  
  observaciones?: string;
  usuario_genero?: string;
  version_normativa?: string;
  created_at?: Date;
  detalles?: {
    cesantias: { valor: number; dias: number; formula: string };
    intereses: { valor: number; formula: string };
    prima: { valor: number; dias: number; formula: string };
    vacaciones: { valor: number; dias: number; formula: string };
    indemnizacion: { valor: number; motivo: string };
    salario_pendiente?: {
        valor_bruto: number;
        aux_transporte: number;
        salud: number;
        pension: number;
        neto: number;
        dias: number;
        valor_dia: number;
    };
  };
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

export interface ConfiguracionFacturacion {
  id?: number;
  nombre_empresa: string;
  nit: string;
  responsable_iva: boolean;
  porcentaje_iva: number | null;
  direccion: string;
  ubicacion_geografica: string;
  telefonos: string[];
  
  // Campos extendidos
  representante_legal?: string;
  tipo_identificacion?: string;
  departamento?: string;
  ciudad?: string;
  telefono2?: string;
  correo_electronico?: string;
  responsabilidad_tributaria?: string;
  tributos?: string[];
  zona?: string;
  sitio_web?: string;
  alias?: string;
  actividad_economica?: string;
  descripcion?: string;
  logo?: string;
}
