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
  mesero: string;
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
  mesero: string;
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
}

export interface ComandaHistorial {
  id: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  mesero: string;
  subtotal: number;
  total: number;
  estado: string;
  observaciones_generales?: string;
  mesas: Mesa[];
  tipo_pedido: 'mesa' | 'domicilio';
  datos_cliente?: DatosCliente;
  items: ItemComandaHistorial[];
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
