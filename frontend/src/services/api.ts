import axios from 'axios';
import { Comanda, Mesa, Producto, Factura, EstadoComanda, ReporteVentas, ItemComanda, ComandaHistorial } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.18.210:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

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
    const response = await api.patch(`/productos/${id}`, producto);
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

  async updateComandaEstado(comandaId: string, estado: string): Promise<Comanda> {
    const response = await api.patch(`/comandas/${comandaId}/estado`, { estado });
    return response.data;
  },

  async actualizarEstadoComanda(comandaId: string, estado: EstadoComanda): Promise<Comanda> {
    const response = await api.patch(`/comandas/${comandaId}/estado`, { estado });
    return response.data;
  },

  async deleteComanda(comandaId: string): Promise<void> {
    await api.delete(`/comandas/${comandaId}`);
  },
  async editarComanda(comandaId: string, items: ItemComanda[], observaciones_generales?: string, imprimir_adicionales?: boolean): Promise<any> {
    const response = await api.put(`/comandas/${comandaId}/editar`, {
      items,
      observaciones_generales,
      imprimir_adicionales
    });
    return response.data;
  },

  async imprimirNuevosItems(comandaId: string, nuevosItems: ItemComanda[]): Promise<void> {
    await api.post(`/comandas/${comandaId}/imprimir-nuevos`, { nuevosItems });
  },

  // Impresión
  async imprimirComanda(comandaId: string): Promise<void> {
    await api.post(`/comandas/${comandaId}/imprimir`);
  },

  async imprimirFactura(comandaId: string): Promise<void> {
    await api.post(`/comandas/${comandaId}/factura`);
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

  // Personalizaciones (endpoints legacy - se mantienen por compatibilidad)
  async getCaldos(): Promise<any[]> {
    const response = await api.get('/personalizaciones/caldos');
    return response.data;
  },

  async createCaldo(caldo: any): Promise<any> {
    const response = await api.post('/personalizaciones/caldos', caldo);
    return response.data;
  },

  async updateCaldo(id: string, caldo: any): Promise<any> {
    const response = await api.patch(`/personalizaciones/caldos/${id}`, caldo);
    return response.data;
  },

  async deleteCaldo(id: string): Promise<void> {
    await api.delete(`/personalizaciones/caldos/${id}`);
  },

  async getPrincipios(): Promise<any[]> {
    const response = await api.get('/personalizaciones/principios');
    return response.data;
  },

  async createPrincipio(principio: any): Promise<any> {
    const response = await api.post('/personalizaciones/principios', principio);
    return response.data;
  },

  async updatePrincipio(id: string, principio: any): Promise<any> {
    const response = await api.patch(`/personalizaciones/principios/${id}`, principio);
    return response.data;
  },

  async deletePrincipio(id: string): Promise<void> {
    await api.delete(`/personalizaciones/principios/${id}`);
  },

  async getProteinas(): Promise<any[]> {
    const response = await api.get('/personalizaciones/proteinas');
    return response.data;
  },

  async createProteina(proteina: any): Promise<any> {
    const response = await api.post('/personalizaciones/proteinas', proteina);
    return response.data;
  },

  async updateProteina(id: string, proteina: any): Promise<any> {
    const response = await api.patch(`/personalizaciones/proteinas/${id}`, proteina);
    return response.data;
  },

  async deleteProteina(id: string): Promise<void> {
    await api.delete(`/personalizaciones/proteinas/${id}`);
  },

  async getBebidas(): Promise<any[]> {
    const response = await api.get('/personalizaciones/bebidas');
    return response.data;
  },

  async createBebida(bebida: any): Promise<any> {
    const response = await api.post('/personalizaciones/bebidas', bebida);
    return response.data;
  },

  async updateBebida(id: string, bebida: any): Promise<any> {
    const response = await api.patch(`/personalizaciones/bebidas/${id}`, bebida);
    return response.data;
  },

  async deleteBebida(id: string): Promise<void> {
    await api.delete(`/personalizaciones/bebidas/${id}`);
  },

  async getHistorialComandas(fecha?: string): Promise<ComandaHistorial[]> {
    const params = fecha ? `?fecha=${fecha}` : '';
    const response = await api.get(`/comandas/historial${params}`);
    return response.data;
  },
};

export default apiService;
