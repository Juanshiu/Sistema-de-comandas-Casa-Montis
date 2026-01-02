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
  mesero: string;
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
