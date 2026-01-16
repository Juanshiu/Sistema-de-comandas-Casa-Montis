import axios from 'axios';
import { Comanda, Mesa, Producto, Factura, EstadoComanda, ReporteVentas, ItemComanda, ComandaHistorial, PaginatedResponse, Empleado, ConfiguracionNomina, NominaDetalle, Liquidacion, ConfiguracionFacturacion, PagoNomina, HistorialNomina } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para agregar el token de autenticación a cada solicitud
api.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage solo en el cliente
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  // Mesas
  async getMesas(): Promise<Mesa[]> {
    const response = await api.get('/mesas');
    return response.data;
  },

  async createMesa(mesa: { numero: string; capacidad: number; salon_id?: number }): Promise<Mesa> {
    const response = await api.post('/mesas', mesa);
    return response.data;
  },

  async updateMesa(id: number, mesa: { numero: string; capacidad: number; salon_id?: number }): Promise<Mesa> {
    const response = await api.put(`/mesas/${id}`, mesa);
    return response.data;
  },

  async deleteMesa(id: number): Promise<void> {
    await api.delete(`/mesas/${id}`);
  },

  async updateMesaEstado(mesaId: number, ocupada: boolean): Promise<Mesa> {
    const response = await api.patch(`/mesas/${mesaId}`, { ocupada });
    return response.data;
  },

  async liberarMesa(mesaId: number): Promise<Mesa> {
    const response = await api.patch(`/mesas/${mesaId}/liberar`);
    return response.data;
  },

  // Salones
  async getSalones(): Promise<any[]> {
    const response = await api.get('/salones');
    return response.data;
  },

  async createSalon(salon: { nombre: string; descripcion?: string }): Promise<any> {
    const response = await api.post('/salones', salon);
    return response.data;
  },

  async updateSalon(id: number, salon: { nombre: string; descripcion?: string; activo: boolean }): Promise<any> {
    const response = await api.put(`/salones/${id}`, salon);
    return response.data;
  },

  async deleteSalon(id: number): Promise<void> {
    await api.delete(`/salones/${id}`);
  },

  async getMesasBySalon(salonId: number): Promise<Mesa[]> {
    const response = await api.get(`/salones/${salonId}/mesas`);
    return response.data;
  },

  // Categorías de Productos
  async getCategoriasProductos(): Promise<any[]> {
    const response = await api.get('/categorias');
    return response.data;
  },

  async getCategoriasProductosActivas(): Promise<any[]> {
    const response = await api.get('/categorias/activas');
    return response.data;
  },

  async createCategoriaProducto(categoria: { nombre: string; descripcion?: string }): Promise<any> {
    const response = await api.post('/categorias', categoria);
    return response.data;
  },

  async updateCategoriaProducto(id: number, categoria: { nombre: string; descripcion?: string; activo?: boolean }): Promise<any> {
    const response = await api.put(`/categorias/${id}`, categoria);
    return response.data;
  },

  async deleteCategoriaProducto(id: number): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },

  async getConteoProductosCategoria(id: number): Promise<{ count: number }> {
    const response = await api.get(`/categorias/${id}/productos/count`);
    return response.data;
  },

  // Productos
  async getProductos(): Promise<Producto[]> {
    const response = await api.get('/productos');
    return response.data;
  },

  async getAllProductos(): Promise<Producto[]> {
    const response = await api.get('/productos/all');
    return response.data;
  },

  async getProductosByCategoria(categoria: string): Promise<Producto[]> {
    const response = await api.get(`/productos/categoria/${categoria}`);
    return response.data;
  },

  async getCategorias(): Promise<string[]> {
    const response = await api.get('/productos/categorias');
    return response.data;
  },

  async createProducto(producto: Partial<Producto>): Promise<Producto> {
    const response = await api.post('/productos', producto);
    return response.data;
  },

  async updateProducto(id: number, producto: Partial<Producto>): Promise<Producto> {
    const response = await api.put(`/productos/${id}`, producto);
    return response.data;
  },

  async deleteProducto(id: number): Promise<void> {
    await api.delete(`/productos/${id}`);
  },

  // Comandas
  async createComanda(comanda: Partial<Comanda>): Promise<Comanda> {
    const response = await api.post('/comandas', comanda);
    return response.data;
  },

  async getComandas(): Promise<Comanda[]> {
    const response = await api.get('/comandas');
    return response.data;
  },

  async getComandasActivas(): Promise<Comanda[]> {
    const response = await api.get('/comandas/activas');
    return response.data;
  },

  async getComandasByMesa(mesaId: number): Promise<Comanda[]> {
    const response = await api.get(`/comandas/mesa/${mesaId}`);
    return response.data;
  },

  async actualizarEstadoComanda(comandaId: string, estado: EstadoComanda): Promise<Comanda> {
    const response = await api.patch(`/comandas/${comandaId}/estado`, { estado });
    return response.data;
  },

  async deleteComanda(comandaId: string): Promise<void> {
    await api.delete(`/comandas/${comandaId}`);
  },
  async editarComanda(comandaId: string, items: ItemComanda[], observaciones_generales?: string, imprimir_adicionales?: boolean, imprimir_completa?: boolean): Promise<any> {
    const response = await api.put(`/comandas/${comandaId}`, {
      items,
      observaciones_generales,
      imprimir: imprimir_adicionales,
      imprimirCompleta: imprimir_completa
    });
    return response.data;
  },

  async cambiarMesaComanda(comandaId: string, nuevas_mesas: Mesa[]): Promise<any> {
    const response = await api.patch(`/comandas/${comandaId}/cambiar-mesa`, {
      nuevas_mesas
    });
    return response.data;
  },

  async getHistorialComandas(fecha?: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<ComandaHistorial>> {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/comandas/historial?${params.toString()}`);
    return response.data;
  },

  // Facturas
  async crearFactura(factura: Partial<Factura>): Promise<Factura> {
    const response = await api.post('/facturas', factura);
    return response.data;
  },

  async getFacturas(): Promise<Factura[]> {
    const response = await api.get('/facturas');
    return response.data;
  },

  // Reportes
  async getReporteVentas(fecha?: string): Promise<ReporteVentas> {
    const params = fecha ? { fecha } : {};
    const response = await api.get('/reportes/ventas', { params });
    return response.data;
  },

  async getReporteVentasPorRango(fechaInicio: string, fechaFin: string): Promise<ReporteVentas[]> {
    const response = await api.get('/reportes/ventas/rango', {
      params: { fechaInicio, fechaFin }
    });
    return response.data;
  },

  // Categorías de Personalización
  async getCategoriasPersonalizacion(): Promise<any[]> {
    const response = await api.get('/personalizaciones/categorias');
    return response.data;
  },

  async createCategoriaPersonalizacion(categoria: any): Promise<any> {
    const response = await api.post('/personalizaciones/categorias', categoria);
    return response.data;
  },

  async updateCategoriaPersonalizacion(id: number, categoria: any): Promise<any> {
    const response = await api.put(`/personalizaciones/categorias/${id}`, categoria);
    return response.data;
  },

  async deleteCategoriaPersonalizacion(id: number): Promise<void> {
    await api.delete(`/personalizaciones/categorias/${id}`);
  },

  // Items de personalización genéricos (funciona con cualquier categoría)
  async getItemsPersonalizacion(categoriaId: number): Promise<any[]> {
    const response = await api.get(`/personalizaciones/categorias/${categoriaId}/items`);
    return response.data;
  },

  async createItemPersonalizacion(categoriaId: number, item: any): Promise<any> {
    const response = await api.post(`/personalizaciones/categorias/${categoriaId}/items`, item);
    return response.data;
  },

  async updateItemPersonalizacion(categoriaId: number, itemId: number, item: any): Promise<any> {
    const response = await api.put(`/personalizaciones/categorias/${categoriaId}/items/${itemId}`, item);
    return response.data;
  },

  async deleteItemPersonalizacion(categoriaId: number, itemId: number): Promise<void> {
    await api.delete(`/personalizaciones/categorias/${categoriaId}/items/${itemId}`);
  },

  async updateDisponibilidadItem(categoriaId: number, itemId: number, disponible: boolean): Promise<any> {
    const response = await api.patch(`/personalizaciones/categorias/${categoriaId}/items/${itemId}/disponibilidad`, { disponible });
    return response.data;
  },

  // Configuración de Facturación
  async getConfiguracionFacturacion(): Promise<any> {
    const response = await api.get('/configuracion/facturacion');
    return response.data;
  },

  async updateConfiguracionFacturacion(config: {
    nombre_empresa: string;
    nit: string;
    responsable_iva: boolean;
    porcentaje_iva: number | null;
    direccion: string;
    ubicacion_geografica: string;
    telefonos: string[];
  }): Promise<any> {
    const response = await api.put('/configuracion/facturacion', config);
    return response.data;
  },

  // ==================== EMPLEADOS ====================
  async getEmpleados(): Promise<Empleado[]> {
    const response = await api.get('/empleados');
    return response.data;
  },

  async getEmpleadosActivos(): Promise<Empleado[]> {
    const response = await api.get('/empleados/activos');
    return response.data;
  },

  async createEmpleado(empleado: Partial<Empleado>): Promise<Empleado> {
    const response = await api.post('/empleados', empleado);
    return response.data;
  },

  async updateEmpleado(id: number, empleado: Partial<Empleado>): Promise<Empleado> {
    const response = await api.put(`/empleados/${id}`, empleado);
    return response.data;
  },

  async deleteEmpleado(id: number): Promise<void> {
    await api.delete(`/empleados/${id}`);
  },

  // ==================== CONFIGURACIÓN NÓMINA ====================
  async getConfiguracionNomina(): Promise<ConfiguracionNomina> {
    const response = await api.get('/nomina/configuracion');
    return response.data;
  },

  async updateConfiguracionNomina(config: Partial<ConfiguracionNomina>): Promise<ConfiguracionNomina> {
    const response = await api.put('/nomina/configuracion', config);
    return response.data;
  },

  // ==================== CÁLCULO Y GESTIÓN DE NÓMINA ====================
  async calcularNomina(
    empleadoId: number,
    diasTrabajados: number,
    extraData?: {
      horas_diurnas?: number;
      horas_dominicales_diurnas?: number;
      horas_festivas_diurnas?: number;
      horas_extra_diurna_dominical?: number;
      comisiones?: number;
      otras_deducciones?: number;
      periodo_mes?: string;
      periodo_anio?: number;
      usuario_nombre?: string;
    }
  ): Promise<NominaDetalle> {
    const response = await api.post('/nomina/calcular', {
      empleado_id: empleadoId,
      dias_trabajados: diasTrabajados,
      ...extraData
    });
    return response.data;
  },

  async guardarNominaDetalle(data: {
    empleado_id: number;
    dias_trabajados: number;
    horas_diurnas?: number;
    horas_dominicales_diurnas?: number;
    horas_festivas_diurnas?: number;
    horas_extra_diurna_dominical?: number;
    comisiones?: number;
    otras_deducciones?: number;
    periodo_mes?: string;
    periodo_anio?: number;
    usuario_nombre?: string;
  }): Promise<{ detalle: NominaDetalle; pagos: PagoNomina[]; saldo_pendiente: number; info: string }> {
    const response = await api.post('/nomina/detalle/guardar', data);
    return response.data;
  },

  async getHistorialNomina(
    empleadoId: number,
    filtros?: { periodo_mes?: string; periodo_anio?: number }
  ): Promise<{ nominas: NominaDetalle[]; pagos: PagoNomina[]; historial: HistorialNomina[] }> {
    const params = new URLSearchParams({
      empleado_id: empleadoId.toString(),
      ...(filtros?.periodo_mes && { periodo_mes: filtros.periodo_mes }),
      ...(filtros?.periodo_anio && { periodo_anio: filtros.periodo_anio.toString() })
    });
    const response = await api.get(`/nomina/historial?${params}`);
    return response.data;
  },

  async eliminarHistorialNomina(data: {
    tipo: 'periodo' | 'fecha';
    periodo_mes?: string;
    periodo_anio?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<{ message: string; deletedCount: number }> {
    const response = await api.delete('/nomina/historial', { data });
    return response.data;
  },

  async registrarPagoNomina(
    nominaDetalleId: number,
    data: {
      valor: number;
      fecha?: string;
      tipo?: 'QUINCENA' | 'AJUSTE' | 'COMPLEMENTO';
      observaciones?: string;
    }
  ): Promise<PagoNomina> {
    const response = await api.post(`/nomina/detalle/${nominaDetalleId}/pagos`, data);
    return response.data;
  },

  async descargarPDFNomina(nominaDetalleId: number): Promise<Blob> {
    const response = await api.get(`/nomina/detalle/${nominaDetalleId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async generarPDFPreview(nominaDetalle: NominaDetalle): Promise<Blob> {
    const response = await api.post('/nomina/generar-pdf-preview', {
      nomina_detalle: nominaDetalle
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ==================== LIQUIDACIÓN ====================
  async calcularLiquidacion(
    empleadoId: number,
    fechaRetiro: Date,
    motivoRetiro: string,
    params?: {
      base_liquidacion_manual?: number;
      salario_fijo?: boolean;
      promedio_12_meses?: number;
      incluir_auxilio_transporte?: boolean;
      dias_vacaciones?: number;
      dias_prima?: number;
      dias_cesantias?: number;
      dias_sueldo_pendientes?: number;
    }
  ): Promise<Liquidacion> {
    const response = await api.post('/nomina/liquidacion/calcular', {
      empleado_id: empleadoId,
      fecha_retiro: fechaRetiro.toISOString(),
      motivo_retiro: motivoRetiro,
      ...params
    });
    return response.data;
  },

  async generarPDFLiquidacion(liquidacion: Liquidacion): Promise<Blob> {
    const response = await api.post('/nomina/liquidacion/pdf-preview', {
      liquidacion
    }, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export default apiService;
