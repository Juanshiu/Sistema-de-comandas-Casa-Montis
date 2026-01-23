"use client";

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Download, UploadCloud, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import { AjustePersonalizacionInsumo, Insumo, Producto, RecetaProductoInsumo, CategoriaPersonalizacion, ItemPersonalizacion, InsumoHistorial, ConfiguracionSistema } from '@/types';

const unidades = ['g', 'kg', 'ml', 'unidad'];

interface InsumoForm {
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  stock_critico: number;
  costo_unitario: number | null;
}

export default function GestionInventarioAvanzado() {
  const [tab, setTab] = useState<'insumos' | 'recetas' | 'ajustes' | 'historial' | 'importacion' | 'configuracion'>('insumos');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [configSistema, setConfigSistema] = useState<ConfiguracionSistema | null>(null);
  const [criticoModo, setCriticoModo] = useState<'CRITICO' | 'BAJO' | 'NUNCA'>('CRITICO');
  const [configError, setConfigError] = useState<string | null>(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumoForm, setInsumoForm] = useState<InsumoForm>({
    nombre: '',
    unidad_medida: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    stock_critico: 0,
    costo_unitario: null
  });
  const [insumoEditandoId, setInsumoEditandoId] = useState<number | null>(null);
  const [insumoError, setInsumoError] = useState<string | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<number | null>(null);
  const [recetaItems, setRecetaItems] = useState<RecetaProductoInsumo[]>([]);
  const [recetaError, setRecetaError] = useState<string | null>(null);

  const [categoriasPersonalizacion, setCategoriasPersonalizacion] = useState<CategoriaPersonalizacion[]>([]);
  const [categoriaPersonalizacionId, setCategoriaPersonalizacionId] = useState<number | null>(null);
  const [itemsPersonalizacion, setItemsPersonalizacion] = useState<ItemPersonalizacion[]>([]);
  const [itemPersonalizacionId, setItemPersonalizacionId] = useState<number | null>(null);
  const [ajustesItems, setAjustesItems] = useState<AjustePersonalizacionInsumo[]>([]);
  const [ajustesError, setAjustesError] = useState<string | null>(null);

  const [ajusteInsumoId, setAjusteInsumoId] = useState<number | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState<number>(0);
  const [ajusteMotivo, setAjusteMotivo] = useState<string>('');
  const [ajusteError, setAjusteError] = useState<string | null>(null);
  const [ajustando, setAjustando] = useState(false);

  const [historial, setHistorial] = useState<InsumoHistorial[]>([]);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [historialInsumoId, setHistorialInsumoId] = useState<number | null>(null);

  const [importando, setImportando] = useState(false);

  const mostrarExito = (mensaje: string) => {
    setMensajeExito(mensaje);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  useEffect(() => {
    cargarInsumos();
    cargarProductos();
    cargarCategoriasPersonalizacion();
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    if (productoSeleccionadoId) {
      cargarRecetaProducto(productoSeleccionadoId);
    } else {
      setRecetaItems([]);
    }
  }, [productoSeleccionadoId]);

  useEffect(() => {
    if (categoriaPersonalizacionId) {
      cargarItemsPersonalizacion(categoriaPersonalizacionId);
    } else {
      setItemsPersonalizacion([]);
    }
  }, [categoriaPersonalizacionId]);

  useEffect(() => {
    if (itemPersonalizacionId) {
      cargarAjustesPersonalizacion(itemPersonalizacionId);
    } else {
      setAjustesItems([]);
    }
  }, [itemPersonalizacionId]);

  useEffect(() => {
    if (tab === 'historial') {
      cargarHistorial();
    }
  }, [tab, historialInsumoId]);

  const cargarInsumos = async () => {
    try {
      const data = await apiService.getInsumos();
      setInsumos(data);
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const data = await apiService.getConfiguracionSistema();
      setConfigSistema(data);
      if (data?.critico_modo === 'CRITICO' || data?.critico_modo === 'BAJO' || data?.critico_modo === 'NUNCA') {
        setCriticoModo(data.critico_modo);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const data = await apiService.getAllProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarCategoriasPersonalizacion = async () => {
    try {
      const data = await apiService.getCategoriasPersonalizacion();
      setCategoriasPersonalizacion(data);
    } catch (error) {
      console.error('Error al cargar categorías de personalización:', error);
    }
  };

  const cargarItemsPersonalizacion = async (categoriaId: number) => {
    try {
      const data = await apiService.getItemsPersonalizacion(categoriaId);
      setItemsPersonalizacion(data);
    } catch (error) {
      console.error('Error al cargar items de personalización:', error);
    }
  };

  const cargarRecetaProducto = async (productoId: number) => {
    try {
      const data = await apiService.getRecetaProducto(productoId);
      setRecetaItems(data);
    } catch (error) {
      console.error('Error al cargar receta:', error);
    }
  };

  const cargarAjustesPersonalizacion = async (itemId: number) => {
    try {
      const data = await apiService.getAjustesPersonalizacion(itemId);
      setAjustesItems(data);
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    }
  };

  const cargarHistorial = async () => {
    try {
      const data = await apiService.getInsumoHistorial(historialInsumoId || undefined, 200);
      setHistorial(data || []);
      setHistorialError(null);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setHistorialError('Error al cargar historial');
    }
  };

  const guardarConfiguracion = async () => {
    try {
      setGuardandoConfig(true);
      setConfigError(null);
      const nuevaConfig: ConfiguracionSistema = {
        inventario_avanzado: configSistema?.inventario_avanzado ?? false,
        critico_modo: criticoModo
      };
      const updated = await apiService.updateConfiguracionSistema(nuevaConfig);
      setConfigSistema(updated);
      mostrarExito('Configuración actualizada');
    } catch (error: any) {
      setConfigError(error?.response?.data?.error || 'Error al guardar configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const validarInsumoForm = () => {
    if (!insumoForm.nombre.trim()) {
      return 'El nombre es obligatorio';
    }
    if (!insumoForm.unidad_medida) {
      return 'La unidad de medida es obligatoria';
    }
    if (insumoForm.stock_actual < 0 || insumoForm.stock_minimo < 0 || insumoForm.stock_critico < 0) {
      return 'Los valores de stock deben ser mayores o iguales a 0';
    }
    if (insumoForm.stock_critico > insumoForm.stock_minimo) {
      return 'El stock crítico no puede ser mayor que el stock mínimo';
    }
    return null;
  };

  const guardarInsumo = async () => {
    const error = validarInsumoForm();
    if (error) {
      setInsumoError(error);
      return;
    }

    try {
      setInsumoError(null);
      if (insumoEditandoId) {
        await apiService.updateInsumo(insumoEditandoId, insumoForm);
      } else {
        await apiService.createInsumo(insumoForm);
      }

      await cargarInsumos();
      cancelarEdicionInsumo();
      mostrarExito('Insumo guardado correctamente');
    } catch (error: any) {
      setInsumoError(error?.response?.data?.error || 'Error al guardar insumo');
    }
  };

  const iniciarEdicionInsumo = (insumo: Insumo) => {
    setInsumoEditandoId(insumo.id);
    setInsumoForm({
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual,
      stock_minimo: insumo.stock_minimo,
      stock_critico: insumo.stock_critico,
      costo_unitario: insumo.costo_unitario ?? null
    });
  };

  const cancelarEdicionInsumo = () => {
    setInsumoEditandoId(null);
    setInsumoForm({
      nombre: '',
      unidad_medida: 'g',
      stock_actual: 0,
      stock_minimo: 0,
      stock_critico: 0,
      costo_unitario: null
    });
  };

  const eliminarInsumo = async (id: number) => {
    if (!confirm('¿Eliminar insumo?')) return;
    try {
      await apiService.deleteInsumo(id);
      await cargarInsumos();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error al eliminar insumo');
    }
  };

  const agregarFilaReceta = () => {
    if (insumos.length === 0) {
      setRecetaError('Debe crear insumos antes de agregar receta');
      return;
    }
    setRecetaItems(prev => ([
      ...prev,
      { producto_id: productoSeleccionadoId || 0, insumo_id: insumos[0].id, cantidad_usada: 1 }
    ]));
  };

  const guardarReceta = async () => {
    if (!productoSeleccionadoId) {
      setRecetaError('Seleccione un producto');
      return;
    }

    const validas = recetaItems.filter(r => r.insumo_id && r.cantidad_usada > 0);
    try {
      setRecetaError(null);
      await apiService.updateRecetaProducto(productoSeleccionadoId, validas);
      await cargarRecetaProducto(productoSeleccionadoId);
      mostrarExito('Receta guardada correctamente');
    } catch (error: any) {
      setRecetaError(error?.response?.data?.error || 'Error al guardar receta');
    }
  };

  const agregarFilaAjuste = () => {
    if (insumos.length === 0) {
      setAjustesError('Debe crear insumos antes de agregar ajustes');
      return;
    }
    setAjustesItems(prev => ([
      ...prev,
      { item_personalizacion_id: itemPersonalizacionId || 0, insumo_id: insumos[0].id, cantidad_ajuste: 1 }
    ]));
  };

  const guardarAjustes = async () => {
    if (!itemPersonalizacionId) {
      setAjustesError('Seleccione una personalización');
      return;
    }

    const validos = ajustesItems.filter(a => a.insumo_id && a.cantidad_ajuste !== 0);
    try {
      setAjustesError(null);
      await apiService.updateAjustesPersonalizacion(itemPersonalizacionId, validos);
      await cargarAjustesPersonalizacion(itemPersonalizacionId);
      mostrarExito('Ajustes guardados correctamente');
    } catch (error: any) {
      setAjustesError(error?.response?.data?.error || 'Error al guardar ajustes');
    }
  };

  const aplicarAjusteManual = async () => {
    if (!ajusteInsumoId) {
      setAjusteError('Seleccione un insumo');
      return;
    }
    if (!ajusteCantidad || Number.isNaN(ajusteCantidad)) {
      setAjusteError('La cantidad es obligatoria');
      return;
    }

    try {
      setAjustando(true);
      setAjusteError(null);
      await apiService.ajustarInsumo(ajusteInsumoId, {
        cantidad: ajusteCantidad,
        motivo: ajusteMotivo || undefined
      });
      await cargarInsumos();
      await cargarHistorial();
      setAjusteCantidad(0);
      setAjusteMotivo('');
      mostrarExito('Ajuste aplicado correctamente');
    } catch (error: any) {
      setAjusteError(error?.response?.data?.error || 'Error al aplicar ajuste');
    } finally {
      setAjustando(false);
    }
  };

  const descargarArchivo = (blob: Blob, nombre: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const leerArchivoBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const manejarImportacion = async (file: File | null, tipo: 'insumos' | 'recetas' | 'productos') => {
    if (!file) return;
    setImportando(true);
    try {
      const base64 = await leerArchivoBase64(file);
      if (tipo === 'insumos') {
        await apiService.importarInsumos(base64);
      } else if (tipo === 'recetas') {
        await apiService.importarRecetas(base64);
      } else {
        await apiService.importarProductosExcel(base64);
      }
      mostrarExito('Importación completada');
      await cargarInsumos();
      await cargarProductos();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error en importación');
    } finally {
      setImportando(false);
    }
  };

  const costosPorInsumo = new Map(insumos.map(insumo => [insumo.id, insumo.costo_unitario ?? 0]));
  const obtenerCosto = (insumoId: number) => costosPorInsumo.get(insumoId) || 0;
  const totalCostoReceta = recetaItems.reduce((sum, item) => sum + (obtenerCosto(item.insumo_id) * item.cantidad_usada), 0);
  const totalCostoAjustes = ajustesItems.reduce((sum, item) => sum + (obtenerCosto(item.insumo_id) * item.cantidad_ajuste), 0);

  return (
    <div className="space-y-6">
      <div className="">
        <div className="flex items-center justify-between">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Inventario Avanzado</h2>
                <p className="text-sm text-secondary-600">Insumos, recetas y ajustes de personalizaciones.</p>
          </div>
          <button
            className="btn-secondary flex items-center"
            onClick={cargarInsumos}
          >
            <RefreshCw size={16} className="mr-2" />
            Recargar
          </button>
        </div>

        {mensajeExito && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            {mensajeExito}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex space-x-2">
        {['insumos', 'recetas', 'ajustes', 'historial', 'importacion', 'configuracion'].map((section) => (
          <button
            key={section}
            className={`px-4 py-2 rounded ${tab === section ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'}`}
            onClick={() => setTab(section as any)}
          >
            {section === 'insumos' ? 'Insumos' : section === 'recetas' ? 'Recetas' : section === 'ajustes' ? 'Ajustes manuales' : section === 'historial' ? 'Historial' : section === 'configuracion' ? 'Configuración' : 'Importar/Exportar'}
          </button>
        ))}
      </div>

      {tab === 'insumos' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Nombre *</label>
              <input
                className="input-field"
                value={insumoForm.nombre}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Unidad de medida *</label>
              <select
                className="input-field"
                value={insumoForm.unidad_medida}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, unidad_medida: e.target.value }))}
              >
                {unidades.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Stock actual *</label>
              <input
                type="number"
                className="input-field"
                value={insumoForm.stock_actual}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_actual: Number(e.target.value) }))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Stock mínimo *</label>
              <input
                type="number"
                className="input-field"
                value={insumoForm.stock_minimo}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_minimo: Number(e.target.value) }))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Stock crítico *</label>
              <input
                type="number"
                className="input-field"
                value={insumoForm.stock_critico}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, stock_critico: Number(e.target.value) }))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Costo unitario (opcional)</label>
              <input
                type="number"
                className="input-field"
                value={insumoForm.costo_unitario ?? ''}
                onChange={(e) => setInsumoForm(prev => ({ ...prev, costo_unitario: e.target.value === '' ? null : Number(e.target.value) }))}
                min="0"
              />
            </div>
          </div>

          {insumoError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{insumoError}</p>
            </div>
          )}

          <div className="flex space-x-2">
            <button className="btn-primary flex items-center" onClick={guardarInsumo}>
              <Save size={16} className="mr-2" />
              {insumoEditandoId ? 'Actualizar' : 'Crear'}
            </button>
            {insumoEditandoId && (
              <button className="btn-secondary" onClick={cancelarEdicionInsumo}>Cancelar</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Costo unitario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {insumos.map((insumo) => (
                  <tr key={insumo.id}>
                    <td className="px-4 py-2 text-sm text-secondary-900">{insumo.nombre}</td>
                    <td className="px-4 py-2 text-sm text-secondary-700">{insumo.unidad_medida}</td>
                    <td className="px-4 py-2 text-sm text-secondary-700">{insumo.stock_actual}</td>
                    <td className="px-4 py-2 text-sm text-secondary-700">
                      {insumo.costo_unitario !== null && insumo.costo_unitario !== undefined ? `$${Number(insumo.costo_unitario).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        insumo.estado === 'CRITICO' ? 'bg-red-100 text-red-700' :
                        insumo.estado === 'BAJO' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insumo.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 rounded border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition"
                          onClick={() => iniciarEdicionInsumo(insumo)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                          onClick={() => eliminarInsumo(insumo.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {insumos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-secondary-500 text-center">No hay insumos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'recetas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900">Recetas por producto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Producto</label>
                <select
                  className="input-field"
                  value={productoSeleccionadoId ?? ''}
                  onChange={(e) => setProductoSeleccionadoId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map(producto => (
                    <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-secondary flex items-center" onClick={agregarFilaReceta}>
                  <Plus size={16} className="mr-2" />
                  Agregar insumo
                </button>
              </div>
            </div>

            {recetaError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-sm text-red-700">{recetaError}</p>
              </div>
            )}

            <div className="space-y-2">
              {recetaItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    className="input-field"
                    value={item.insumo_id}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRecetaItems(prev => prev.map((r, i) => i === index ? { ...r, insumo_id: value } : r));
                    }}
                  >
                    {insumos.map(insumo => (
                      <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input-field"
                    value={item.cantidad_usada}
                    min="0"
                    step="0.01"
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRecetaItems(prev => prev.map((r, i) => i === index ? { ...r, cantidad_usada: value } : r));
                    }}
                  />
                  <div className="input-field flex items-center text-sm text-secondary-700">
                    $ {(obtenerCosto(item.insumo_id) * item.cantidad_usada).toFixed(2)}
                  </div>
                  <button
                    className="btn-secondary flex items-center justify-center"
                    onClick={() => setRecetaItems(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="text-sm text-secondary-600">
              Costo estimado total: <span className="font-semibold text-secondary-900">$ {totalCostoReceta.toFixed(2)}</span>
            </div>

            <button className="btn-primary flex items-center" onClick={guardarReceta}>
              <Save size={16} className="mr-2" />
              Guardar receta
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-secondary-900">Ajustes por personalización</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Categoría</label>
                <select
                  className="input-field"
                  value={categoriaPersonalizacionId ?? ''}
                  onChange={(e) => setCategoriaPersonalizacionId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Selecciona categoría</option>
                  {categoriasPersonalizacion.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Item</label>
                <select
                  className="input-field"
                  value={itemPersonalizacionId ?? ''}
                  onChange={(e) => setItemPersonalizacionId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Selecciona item</option>
                  {itemsPersonalizacion.map(item => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn-secondary flex items-center" onClick={agregarFilaAjuste}>
                  <Plus size={16} className="mr-2" />
                  Agregar ajuste
                </button>
              </div>
            </div>

            {ajustesError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-sm text-red-700">{ajustesError}</p>
              </div>
            )}

            <div className="space-y-2">
              {ajustesItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    className="input-field"
                    value={item.insumo_id}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setAjustesItems(prev => prev.map((r, i) => i === index ? { ...r, insumo_id: value } : r));
                    }}
                  >
                    {insumos.map(insumo => (
                      <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input-field"
                    value={item.cantidad_ajuste}
                    step="0.01"
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setAjustesItems(prev => prev.map((r, i) => i === index ? { ...r, cantidad_ajuste: value } : r));
                    }}
                  />
                  <div className="input-field flex items-center text-sm text-secondary-700">
                    $ {(obtenerCosto(item.insumo_id) * item.cantidad_ajuste).toFixed(2)}
                  </div>
                  <button
                    className="btn-secondary flex items-center justify-center"
                    onClick={() => setAjustesItems(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="text-sm text-secondary-600">
              Costo estimado total: <span className="font-semibold text-secondary-900">$ {totalCostoAjustes.toFixed(2)}</span>
            </div>

            <button className="btn-primary flex items-center" onClick={guardarAjustes}>
              <Save size={16} className="mr-2" />
              Guardar ajustes
            </button>
          </div>
        </div>
      )}

      {tab === 'ajustes' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">Ajustes manuales de stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Insumo</label>
              <select
                className="input-field"
                value={ajusteInsumoId ?? ''}
                onChange={(e) => setAjusteInsumoId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecciona un insumo</option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Cantidad (+/-)</label>
              <input
                type="number"
                className="input-field"
                value={ajusteCantidad}
                step="0.01"
                onChange={(e) => setAjusteCantidad(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700">Motivo (opcional)</label>
              <input
                className="input-field"
                value={ajusteMotivo}
                onChange={(e) => setAjusteMotivo(e.target.value)}
              />
            </div>
          </div>

          {ajusteError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{ajusteError}</p>
            </div>
          )}

          <button className="btn-primary" onClick={aplicarAjusteManual} disabled={ajustando}>
            Aplicar ajuste
          </button>
        </div>
      )}

      {tab === 'configuracion' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900">Regla de bloqueo por inventario</h3>
            <p className="text-sm text-secondary-600">Configura cuándo bloquear el cierre de comandas si algún insumo está en riesgo.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <select
              className="input-field max-w-xs"
              value={criticoModo}
              onChange={(e) => setCriticoModo(e.target.value as 'CRITICO' | 'BAJO' | 'NUNCA')}
            >
              <option value="CRITICO">Bloquear solo crítico</option>
              <option value="BAJO">Bloquear bajo y crítico</option>
              <option value="NUNCA">No bloquear (solo avisar)</option>
            </select>
            <button
              className="btn-primary flex items-center"
              onClick={guardarConfiguracion}
              disabled={guardandoConfig}
            >
              <Save size={16} className="mr-2" />
              Guardar configuración
            </button>
          </div>
          {configError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{configError}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div>
              <label className="block text-sm font-medium text-secondary-700">Filtrar por insumo</label>
              <select
                className="input-field"
                value={historialInsumoId ?? ''}
                onChange={(e) => setHistorialInsumoId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todos</option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                ))}
              </select>
            </div>
            <button className="btn-secondary" onClick={cargarHistorial}>Actualizar</button>
          </div>

          {historialError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-sm text-red-700">{historialError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Insumo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Cantidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Evento</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-100">
                {historial.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-secondary-700">{item.fecha_hora}</td>
                    <td className="px-4 py-2 text-sm text-secondary-900">{item.insumo_nombre || item.insumo_id}</td>
                    <td className={`px-4 py-2 text-sm ${item.cantidad < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.cantidad} {item.unidad_medida}
                    </td>
                    <td className="px-4 py-2 text-sm text-secondary-700">{item.tipo_evento}</td>
                    <td className="px-4 py-2 text-sm text-secondary-600">{item.motivo || '—'}</td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-sm text-secondary-500 text-center">Sin movimientos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'importacion' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">Importar / Exportar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-secondary-800">Productos</p>
              <button
                className="btn-secondary flex items-center"
                onClick={async () => {
                  const blob = await apiService.exportarProductosExcel();
                  descargarArchivo(blob, 'productos.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'productos')}
                disabled={importando}
              />
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-secondary-800">Insumos</p>
              <button
                className="btn-secondary flex items-center"
                onClick={async () => {
                  const blob = await apiService.exportarInsumos();
                  descargarArchivo(blob, 'insumos.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'insumos')}
                disabled={importando}
              />
            </div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-secondary-800">Recetas</p>
              <button
                className="btn-secondary flex items-center"
                onClick={async () => {
                  const blob = await apiService.exportarRecetas();
                  descargarArchivo(blob, 'recetas.xlsx');
                }}
              >
                <Download size={16} className="mr-2" />
                Exportar
              </button>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => manejarImportacion(e.target.files?.[0] || null, 'recetas')}
                disabled={importando}
              />
            </div>
          </div>
          <div className="flex items-center text-sm text-secondary-600">
            <UploadCloud size={16} className="mr-2" />
            Plantillas nuevas separadas por entidad. Mantén el formato de columnas exportadas.
          </div>
        </div>
      )}
    </div>
  );
}
