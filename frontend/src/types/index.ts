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

export type TipoServicio = 
  | 'desayuno'
  | 'almuerzo'
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
}

export interface PersonalizacionItem {
  // Para desayunos y almuerzos
  caldo?: OpcionCaldo;
  principio?: OpcionPrincipio;
  proteina?: OpcionProteina;
  bebida?: OpcionBebida;
  precio_adicional?: number;
}

export interface OpcionCaldo {
  id: string;
  nombre: string;
  precio_adicional: number;
}

export interface OpcionPrincipio {
  id: string;
  nombre: string;
  precio_adicional: number;
}

export interface OpcionProteina {
  id: string;
  nombre: string;
  precio_adicional: number;
}

export interface OpcionBebida {
  id: string;
  nombre: string;
  precio_adicional: number;
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
  productos_mas_vendidos: ProductoVendido[];
  ventas_por_hora: VentaPorHora[];
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
}

export interface DesayunoConfig {
  solo_bandeja: number;
  bandeja_con_caldo: number;
  con_caldo_bagre: number;
}

export interface AlmuerzoConfig {
  solo_bandeja: number;
  bandeja_con_sopa: number;
  con_caldo_bagre: number;
}

export interface PasoComanda {
  paso: number;
  titulo: string;
  completado: boolean;
}

export interface FormularioComanda {
  mesas: Mesa[];
  tipo_servicio?: TipoServicio;
  items: ItemComanda[];
  observaciones_generales?: string;
  mesero: string;
}
