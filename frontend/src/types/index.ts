
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
  usa_insumos?: boolean;
  cantidad_inicial?: number | null;
  cantidad_actual?: number | null;
}

export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: 'g' | 'kg' | 'ml' | 'unidad' | string;
  stock_actual: number;
  stock_minimo: number;
  stock_critico: number;
  costo_unitario?: number | null;
  activo?: boolean;
  estado?: 'OK' | 'BAJO' | 'CRITICO';
  created_at?: string;
  updated_at?: string;
}

export interface RecetaProductoInsumo {
  producto_id: number;
  insumo_id: number;
  cantidad_usada: number;
  insumo_nombre?: string;
  unidad_medida?: string;
}

export interface AjustePersonalizacionInsumo {
  item_personalizacion_id: number;
  insumo_id: number;
  cantidad_ajuste: number;
  insumo_nombre?: string;
  unidad_medida?: string;
}

export interface ConfiguracionSistema {
  id?: number;
  inventario_avanzado: boolean;
  critico_modo?: 'CRITICO' | 'BAJO' | 'NUNCA';
  created_at?: string;
  updated_at?: string;
}

export interface InsumoHistorial {
  id: number;
  fecha_hora: string;
  insumo_id: number;
  insumo_nombre?: string;
  cantidad: number;
  unidad_medida: string;
  producto_id?: number | null;
  producto_nombre?: string | null;
  comanda_id?: string | null;
  tipo_evento: string;
  motivo?: string | null;
  usuario_id?: number | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
}

export interface Proveedor {
  id: number;
  nombre: string;
  documento?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;  descripcion?: string;  pais?: string;
  departamento?: string;
  ciudad?: string;
  banco_nombre?: string;
  banco_tipo_cuenta?: string;
  banco_titular?: string;
  banco_nit_titular?: string;
  banco_numero_cuenta?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
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
  usa_insumos?: boolean | number;
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

export interface FormularioComanda {
  mesas: Mesa[];
  items: ItemComanda[];
  tipo_pedido?: 'mesa' | 'domicilio';
  tipo_servicio?: string;
  datos_cliente?: DatosCliente;
  observaciones_generales?: string;
}

export interface Comanda {
  id: string;
  mesas: Mesa[];
  items: ItemComanda[];
  subtotal: number;
  total: number;
  estado: EstadoComanda;
  observaciones_generales?: string;
  mesero?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  datos_cliente?: DatosCliente;
  tipo_pedido?: 'mesa' | 'llevar' | 'domicilio';
}

export interface ComandaHistorial {
  id: string;
  mesas: string;
  items_resumen: string;
  total: number;
  estado: string;
  mesero: string;
  fecha: string;
  tipo_pedido: string;
  cliente_nombre?: string;
}

export type EstadoComanda = 'abierta' | 'en_preparacion' | 'lista' | 'entregada' | 'pagada' | 'cancelada';

export interface Factura {
  id: number;
  numero_factura: string;
  comanda_id: string;
  subtotal: number;
  impuestos: number;
  propina: number;
  total: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  cliente_nombre?: string;
  cliente_documento?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  fecha_emision: string;
}

export interface ReporteVentas {
  fecha: string;
  total_ventas: number;
  cantidad_comandas: number;
  ventas_por_metodo: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  productos_mas_vendidos: {
    nombre: string;
    cantidad: number;
    total: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string;
  tipo_trabajador: string;
  subtipo_trabajador?: string;
  alto_riesgo: boolean;
  salario_integral: boolean;
  frecuencia_pago: string;
  salario_base: number;
  auxilio_transporte: boolean;
  metodo_pago: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface ConfiguracionNomina {
  salario_minimo: number;
  auxilio_transporte: number;
  uvt: number;
  horas_laborales_mes: number;
  porcentaje_salud_empleado: number;
  porcentaje_pension_empleado: number;
  porcentaje_salud_empleador: number;
  porcentaje_pension_empleador: number;
  porcentaje_riesgos_1: number;
  porcentaje_sena: number;
  porcentaje_icbf: number;
  porcentaje_caja: number;
  recargo_nocturno: number;
  recargo_dominical: number;
  recargo_festivo: number;
  recargo_diurno: number; // Added recargo_diurno
}

export interface NominaDetalle {
  id?: number;
  empleado_id: number;
  periodo_mes: string;
  periodo_anio: number;
  dias_trabajados: number;
  sueldo_basico: number;
  auxilio_transporte: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  horas_extras_festivas: number;
  recargo_nocturno: number;
  total_devengado: number;
  salud: number;
  pension: number;
  fondo_solidaridad: number;
  retencion_fuente: number;
  otras_deducciones: number;
  total_deducciones: number;
  neto_pagado: number;
  fecha_generacion?: string;
  estado?: string;
  empleado_nombre?: string;
  empleado_documento?: string;
  horas_diurnas?: number; // Added horas_diurnas
}

export interface Liquidacion {
  id?: number;
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo_retiro: string;
  dias_laborados: number;
  cesantias: number;
  intereses_cesantias: number;
  prima_servicios: number;
  vacaciones: number;
  total_liquidacion: number;
  fecha_liquidacion?: string;
  usuario_genero?: string;
  version_normativa?: string;
  empleado?: Empleado;
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
  
  // Nuevos campos extendidos
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

  created_at?: string;
  updated_at?: string;
}

export interface PagoNomina {
  id?: number;
  nomina_detalle_id: number;
  empleado_id: number;
  periodo_mes: string;
  periodo_anio: number;
  fecha: string;
  tipo: 'QUINCENA' | 'AJUSTE' | 'COMPLEMENTO';
  valor: number;
  usuario_nombre?: string;
  observaciones?: string;
}

export interface HistorialNomina {
  id: number;
  periodo_mes: string;
  periodo_anio: number;
  total_empleados: number;
  total_pagado: number;
  fecha_generacion: string;
  usuario: string;
}

export interface ContratoDetails {
  TIPO_CONTRATO: string;
  DURACION_CONTRATO: string;
  FECHA_INICIO: string;
  FECHA_FIN: string;
  PERIODO_PRUEBA: string;
  DIAS_LABORADOS: string;
  HORARIO_TRABAJO: string;
  FORMA_PAGO: string;
  PERIODO_PAGO: string;
  FECHAS_PAGO: string;
  LUGAR_FIRMA: string;
  FECHA_FIRMA: string;
}

export interface GenerarContratoResponse {
  success: boolean;
  message: string;
  url: string;
  file_name: string;
}

export interface ContratoHistorico {
  id: number;
  empleado_id: number;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_contrato?: string;
  cargo?: string;
  salario?: number;
  file_name: string;
  file_path: string;
  contrato_details: ContratoDetails;
  usuario_id?: number;
  usuario_nombre?: string;
  created_at: string;
}
