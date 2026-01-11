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
