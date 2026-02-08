'use client';

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Comanda, Factura, EstadoComanda } from '@/types';
import { apiService } from '@/services/api';
import { CreditCard, DollarSign, Receipt, CheckCircle, Clock, AlertCircle, ArrowRightLeft, Smartphone } from 'lucide-react';
import { usePersonalizaciones, getPersonalizacionesParaImpresion } from '@/components/shared';

interface InterfazCajaProps {
  onMesaLiberada?: () => void;
}

export default function InterfazCaja({ onMesaLiberada }: InterfazCajaProps) {
  const [comandasActivas, setComandasActivas] = useState<Comanda[]>([]);
  const [comandaSeleccionada, setComandaSeleccionada] = useState<Comanda | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo'); // | 'mixto'
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalRecibo, setMostrarModalRecibo] = useState(false);
  const [facturaParaRecibo, setFacturaParaRecibo] = useState<any>(null);
  const [montoPagado, setMontoPagado] = useState<string>('');
  const [cambio, setCambio] = useState<number>(0);
  const [facturasImpresas, setFacturasImpresas] = useState<Set<string>>(new Set());
  const [itemsPagados, setItemsPagados] = useState<{ [comandaId: string]: Set<string> }>(() => {
    // Cargar estado desde localStorage al iniciar
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('itemsPagadosCaja');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convertir arrays de vuelta a Sets
          const result: { [key: string]: Set<string> } = {};
          for (const [comandaId, itemIds] of Object.entries(parsed)) {
            result[comandaId] = new Set(itemIds as string[]);
          }
          return result;
        }
      } catch (e) {
        console.error('Error cargando itemsPagados desde localStorage:', e);
      }
    }
    return {};
  });
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [comandaACancelar, setComandaACancelar] = useState<Comanda | null>(null);
  const { categorias: categoriasPersonalizacion, itemsPorCategoria: itemsPersonalizacion, ordenarPersonalizaciones } = usePersonalizaciones();
  const [configFacturacion, setConfigFacturacion] = useState<any>(null);
  
  // Ref para preservar posición del scroll
  const scrollPosRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  
  // Guardar posición del scroll continuamente
  useEffect(() => {
    const handleScroll = () => {
      scrollPosRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Restaurar scroll después de actualizaciones (pero NO en la primera carga)
  useLayoutEffect(() => {
    if (!isFirstLoadRef.current && !loading) {
      window.scrollTo(0, scrollPosRef.current);
    }
    if (isFirstLoadRef.current && !loading) {
      isFirstLoadRef.current = false;
    }
  }, [comandasActivas, loading]);

  useEffect(() => {
    cargarComandasActivas();
    cargarConfiguracionFacturacion();
    // Actualizar cada 5 segundos para tiempo real
    const interval = setInterval(cargarComandasActivas, 5000);
    return () => clearInterval(interval);
  }, []);

  // Actualizar comanda seleccionada si cambia en la lista de activas
  useEffect(() => {
    if (comandaSeleccionada) {
      const comandaActualizada = comandasActivas.find(c => c.id === comandaSeleccionada.id);
      
      if (comandaActualizada) {
        // Comparar propiedades clave para detectar cambios significativos
        // JSON.stringify puede fallar si el orden de las propiedades cambia o si hay referencias circulares (aunque no debería aquí)
        // Pero es la forma más segura de detectar cambios profundos en items
        const haCambiado = JSON.stringify(comandaActualizada) !== JSON.stringify(comandaSeleccionada);
        
        if (haCambiado) {
          console.log('🔄 Actualizando comanda seleccionada con nuevos datos...');
          setComandaSeleccionada(comandaActualizada);
        }
      }
    }
  }, [comandasActivas, comandaSeleccionada]);

  useEffect(() => {
    if (comandaSeleccionada && montoPagado) {
      const pago = parseFloat(montoPagado) || 0;
      const totalPendiente = calcularTotalPendiente(comandaSeleccionada);
      setCambio(Math.max(0, pago - totalPendiente));
    }
  }, [montoPagado, comandaSeleccionada, itemsPagados]);

  const cargarComandasActivas = async () => {
    try {
      // Solo cambiar loading en la primera carga
      if (isFirstLoadRef.current) {
        setLoading(true);
      }
      const comandas = await apiService.getComandasActivas();
      setComandasActivas(comandas);
      setError(null);
    } catch (err) {
      setError('Error al cargar las comandas');
      console.error('Error:', err);
    } finally {
      if (isFirstLoadRef.current) {
        setLoading(false);
      }
    }
  };

  const cargarConfiguracionFacturacion = async () => {
    try {
      const config = await apiService.getConfiguracionFacturacion();
      setConfigFacturacion(config);
    } catch (err) {
      console.error('Error al cargar configuración de facturación:', err);
      // Usar configuración por defecto si falla
      setConfigFacturacion({
        nombre_empresa: 'MONTIS CLOUD',
        nit: '26420708-2',
        responsable_iva: false,
        porcentaje_iva: null,
        direccion: 'CRA 9 # 11 07 - EDUARDO SANTOS',
        ubicacion_geografica: 'PALERMO - HUILA',
        telefonos: ['3132171025', '3224588520']
      });
    }
  };

  // Funciones para manejar items pagados
  const toggleItemPagado = (comandaId: string, itemId: string) => {
    setItemsPagados(prev => {
      const nuevosItems = { ...prev };
      if (!nuevosItems[comandaId]) {
        nuevosItems[comandaId] = new Set();
      }
      
      const itemsComanda = new Set(nuevosItems[comandaId]);
      if (itemsComanda.has(itemId)) {
        itemsComanda.delete(itemId);
      } else {
        itemsComanda.add(itemId);
      }
      
      nuevosItems[comandaId] = itemsComanda;
      
      // Guardar en localStorage
      guardarItemsPagadosEnStorage(nuevosItems);
      
      return nuevosItems;
    });
  };

  // Función para guardar en localStorage (convierte Sets a Arrays para serializar)
  const guardarItemsPagadosEnStorage = (items: { [comandaId: string]: Set<string> }) => {
    try {
      const serializable: { [key: string]: string[] } = {};
      for (const [comandaId, itemIds] of Object.entries(items)) {
        serializable[comandaId] = Array.from(itemIds);
      }
      localStorage.setItem('itemsPagadosCaja', JSON.stringify(serializable));
    } catch (e) {
      console.error('Error guardando itemsPagados en localStorage:', e);
    }
  };

  const isItemPagado = (comandaId: string, itemId: string): boolean => {
    return itemsPagados[comandaId]?.has(itemId) || false;
  };

  const calcularTotalPendiente = (comanda: Comanda): number => {
    if (!comanda.items || comanda.items.length === 0) return 0;
    
    const itemsPagadosComanda = itemsPagados[comanda.id] || new Set();
    const totalPendiente = comanda.items
      .filter(item => !itemsPagadosComanda.has(item.id))
      .reduce((sum, item) => sum + item.subtotal, 0);
    
    return totalPendiente;
  };

  const getItemsPendientes = (comanda: Comanda) => {
    if (!comanda.items || comanda.items.length === 0) return [];
    
    const itemsPagadosComanda = itemsPagados[comanda.id] || new Set();
    return comanda.items.filter(item => !itemsPagadosComanda.has(item.id));
  };

  const parseDatosCliente = (comanda: Comanda) => {
    const raw = (comanda as any).datos_cliente;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  };

  const getNombreCliente = (comanda: Comanda) => {
    const datosCliente = parseDatosCliente(comanda);
    return datosCliente?.nombre || (comanda as any).cliente_nombre || 'Cliente';
  };

  const esParaLlevar = (comanda: Comanda) => {
    const datosCliente = parseDatosCliente(comanda);
    return comanda.tipo_pedido === 'llevar' || (comanda.tipo_pedido === 'domicilio' && datosCliente?.es_para_llevar);
  };

  const marcarTodosComoNoPagados = (comandaId: string) => {
    setItemsPagados(prev => {
      const nuevosItems = { ...prev };
      nuevosItems[comandaId] = new Set();
      
      // Guardar en localStorage
      guardarItemsPagadosEnStorage(nuevosItems);
      
      return nuevosItems;
    });
  };

  const cancelarComanda = async () => {
    if (!comandaACancelar) return;

    try {
      await apiService.actualizarEstadoComanda(comandaACancelar.id, 'cancelada');
      await cargarComandasActivas();
      
      if (comandaSeleccionada?.id === comandaACancelar.id) {
        setComandaSeleccionada(null);
      }
      
      setMostrarModalCancelar(false);
      setComandaACancelar(null);
      
      if (onMesaLiberada) {
        onMesaLiberada();
      }
    } catch (err) {
      console.error('Error al cancelar comanda:', err);
      alert('Error al cancelar la comanda');
    }
  };

  const procesarFactura = async () => {
    if (!comandaSeleccionada) return;

    const totalPendiente = calcularTotalPendiente(comandaSeleccionada);
    
    // Validar monto pagado para efectivo solo si hay pendiente visual
    // Si todo está marcado (totalPendiente == 0), asumimos que ya se cobró
    if (metodoPago === 'efectivo' && totalPendiente > 0) {
      const pago = parseFloat(montoPagado) || 0;
      if (pago < totalPendiente) {
        alert('El monto pagado no puede ser menor al total pendiente');
        return;
      }
    }

    try {
      setProcesandoPago(true);
      
      // Siempre procesar como pago total y liberar mesa
      const montoPagadoFinal = metodoPago === 'efectivo' && totalPendiente > 0 
        ? parseFloat(montoPagado) 
        : comandaSeleccionada.total;
      
      const facturaData = {
        comanda_id: comandaSeleccionada.id,
        metodo_pago: metodoPago,
        cajero: 'Cajero Principal',
        monto_pagado: montoPagadoFinal,
        cambio: metodoPago === 'efectivo' ? cambio : 0
      };

      const response = await apiService.crearFactura(facturaData);
      
      // Preparar datos para el recibo usando el mismo montoPagadoFinal ya calculado
      setFacturaParaRecibo({
        ...response,
        comanda: comandaSeleccionada,
        metodo_pago: metodoPago,
        monto_pagado: montoPagadoFinal,
        cambio: metodoPago === 'efectivo' ? cambio : 0
      });
      
      // Limpiar items pagados de esta comanda
      setItemsPagados(prev => {
        const nuevosItems = { ...prev };
        delete nuevosItems[comandaSeleccionada.id];
        
        // Guardar en localStorage
        guardarItemsPagadosEnStorage(nuevosItems);
        
        return nuevosItems;
      });
      
      if (onMesaLiberada) {
        onMesaLiberada();
      }
      
      setComandaSeleccionada(null);
      
      // Actualizar lista
      await cargarComandasActivas();
      
      setMontoPagado('');
      setCambio(0);

      // Mostrar modal para preguntar si quiere imprimir recibo
      setMostrarModalRecibo(true);
      
    } catch (err) {
      console.error('Error al procesar factura:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error al procesar la factura: ${errorMessage}`);
    } finally {
      setProcesandoPago(false);
    }
  };

  // FACTURA DETALLADA
  const marcarFacturaImpresa = (comandaId: string) => {
    setFacturasImpresas(prev => new Set(prev).add(comandaId));
  };

  // Helper para centrar texto en facturas térmicas (32 caracteres aprox)
  const centrarTexto = (texto: string, ancho: number = 32): string => {
    if (texto.length >= ancho) return texto;
    const espacios = Math.floor((ancho - texto.length) / 2);
    return ' '.repeat(espacios) + texto;
  };

  const generarFactura = () => {
    if (!comandaSeleccionada || !configFacturacion) return;
    
    // Marcar como impresa
    marcarFacturaImpresa(comandaSeleccionada.id);
    
    // Información de mesa o cliente según tipo
    let mesaInfo = '';
    if (comandaSeleccionada.tipo_pedido === 'domicilio' && comandaSeleccionada.datos_cliente) {
      const tipo = comandaSeleccionada.datos_cliente.es_para_llevar ? 'PARA LLEVAR' : 'DOMICILIO';
      mesaInfo = `${tipo}: ${comandaSeleccionada.datos_cliente.nombre}`;
      if (comandaSeleccionada.datos_cliente.telefono) {
        mesaInfo += `\nTel: ${comandaSeleccionada.datos_cliente.telefono}`;
      }
      if (!comandaSeleccionada.datos_cliente.es_para_llevar && comandaSeleccionada.datos_cliente.direccion) {
        mesaInfo += `\nDir: ${comandaSeleccionada.datos_cliente.direccion}`;
      }
    } else if (comandaSeleccionada.mesas && Array.isArray(comandaSeleccionada.mesas) && comandaSeleccionada.mesas.length > 0) {
      mesaInfo = `Mesa(s): ${comandaSeleccionada.mesas.map(m => `${m.salon}-${m.numero}`).join(', ')}`;
    }

    // Calcular IVA si aplica
    let subtotal = comandaSeleccionada.total;
    let iva = 0;
    let total = comandaSeleccionada.total;

    if (configFacturacion.responsable_iva && configFacturacion.porcentaje_iva) {
      // Si es responsable de IVA, el total incluye IVA
      // Calculamos el subtotal sin IVA
      subtotal = comandaSeleccionada.total / (1 + configFacturacion.porcentaje_iva / 100);
      iva = comandaSeleccionada.total - subtotal;
    }

    // Construir línea de teléfonos
    const telefonos = [];
    if (configFacturacion.telefonos && configFacturacion.telefonos.length > 0 && configFacturacion.telefonos[0]) {
      telefonos.push(configFacturacion.telefonos[0]);
    }
    if (configFacturacion.telefono2 && configFacturacion.telefono2.trim()) {
      telefonos.push(configFacturacion.telefono2);
    }
    const lineaTelefonos = telefonos.length > 0 ? `TEL: ${telefonos.join(' - ')}` : '';

    // Construir línea de ubicación (departamento + ciudad)
    const ubicacionParts = [];
    if (configFacturacion.departamento) ubicacionParts.push(configFacturacion.departamento);
    if (configFacturacion.ciudad) ubicacionParts.push(configFacturacion.ciudad);
    const lineaUbicacion = ubicacionParts.length > 0 ? ubicacionParts.join(' - ') : (configFacturacion.ubicacion_geografica || '');
    
    const facturaContent = `
================================
${centrarTexto(configFacturacion.nombre_empresa)}
${centrarTexto(`CC./NIT.: ${configFacturacion.nit}`)}
${centrarTexto(configFacturacion.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA')}
${centrarTexto(configFacturacion.direccion)}
${lineaUbicacion ? centrarTexto(lineaUbicacion) : ''}
${lineaTelefonos ? centrarTexto(lineaTelefonos) : ''}
================================
${mesaInfo}
Fecha: ${new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
Atendido por: ${comandaSeleccionada.usuario_nombre || comandaSeleccionada.mesero}
================================
CANT ARTICULO    V.UNIT  TOTAL
--------------------------------
${(comandaSeleccionada.items || []).map(item => {
  const maxLength = 12;
  const nombre = item.producto.nombre;
  const valorUnitario = item.precio_unitario;
  
  // Si el nombre es corto, usar padding normal
  let itemText = '';
  if (nombre.length <= maxLength) {
    itemText = `${item.cantidad.toString().padStart(3, ' ')} ${nombre.padEnd(maxLength)} ${valorUnitario.toLocaleString('es-CO').padStart(6, ' ')} ${item.subtotal.toLocaleString('es-CO').padStart(6, ' ')}`;
  } else {
    // Si es largo, dividir en múltiples líneas
    const words = nombre.split(' ');
    let currentLine = '';
    let lines = [];
    
    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Primera línea con cantidad, valor unitario y total
    itemText = `${item.cantidad.toString().padStart(3, ' ')} ${lines[0].padEnd(maxLength)} ${valorUnitario.toLocaleString('es-CO').padStart(6, ' ')} ${item.subtotal.toLocaleString('es-CO').padStart(6, ' ')}`;
    
    // Líneas adicionales del nombre, indentadas
    for (let i = 1; i < lines.length; i++) {
      itemText += `\n    ${lines[i]}`;
    }
  }
  
  // Agregar personalización si existe
  if (item.personalizacion && Object.keys(item.personalizacion).length > 0) {
    const personalizaciones = getPersonalizacionesParaImpresion(
      item.personalizacion,
      categoriasPersonalizacion,
      itemsPersonalizacion
    );
    
    if (personalizaciones.length > 0) {
      itemText += `\n    ${personalizaciones.join(' | ')}`;
    }
  }
  
  if (item.observaciones) {
    itemText += `\n    Obs: ${item.observaciones}`;
  }
  
  return itemText;
}).join('\n')}
--------------------------------
${comandaSeleccionada.observaciones_generales ? `Obs. generales:\n${comandaSeleccionada.observaciones_generales}\n================================\n` : '================================\n'}
${configFacturacion.responsable_iva && configFacturacion.porcentaje_iva ? `SUBTOTAL                 ${subtotal.toLocaleString('es-CO').padStart(7, ' ')}
IVA (${configFacturacion.porcentaje_iva}%)              ${iva.toLocaleString('es-CO').padStart(7, ' ')}
--------------------------------
` : ''}VALOR TOTAL              ${total.toLocaleString('es-CO').padStart(7, ' ')}
================================
    GRACIAS POR SU COMPRA
       VUELVA PRONTO
================================
    `;
    
    // Navegar a la página de factura con los datos (usando base64 para evitar problemas con caracteres especiales)
    const facturaData = btoa(unescape(encodeURIComponent(facturaContent)));
    window.open(`/factura?data=${facturaData}`, '_blank');
  };

  // RECIBO DE PAGO
  const generarRecibo = (factura: any) => {
    if (!configFacturacion) return;

    const fechaActual = new Date();
    const numeroFactura = Math.floor(Math.random() * 9999) + 1000;
    
    // Información de mesa o cliente según tipo
    let mesaInfo = '';
    if (factura.comanda.tipo_pedido === 'domicilio' && factura.comanda.datos_cliente) {
      const tipo = factura.comanda.datos_cliente.es_para_llevar ? 'PARA LLEVAR' : 'DOMICILIO';
      mesaInfo = `${tipo}: ${factura.comanda.datos_cliente.nombre}`;
      if (factura.comanda.datos_cliente.telefono) {
        mesaInfo += `\nTel: ${factura.comanda.datos_cliente.telefono}`;
      }
      if (!factura.comanda.datos_cliente.es_para_llevar && factura.comanda.datos_cliente.direccion) {
        mesaInfo += `\nDir: ${factura.comanda.datos_cliente.direccion}`;
      }
    } else if (factura.comanda.mesas && Array.isArray(factura.comanda.mesas) && factura.comanda.mesas.length > 0) {
      mesaInfo = `MESA: ${factura.comanda.mesas.map((m: any) => `${m.salon}-${m.numero}`).join(', ')}`;
    }

    // Calcular IVA si aplica
    let subtotal = factura.comanda.total;
    let iva = 0;
    let total = factura.comanda.total;

    if (configFacturacion.responsable_iva && configFacturacion.porcentaje_iva) {
      subtotal = factura.comanda.total / (1 + configFacturacion.porcentaje_iva / 100);
      iva = factura.comanda.total - subtotal;
    }

    // Construir línea de teléfonos
    const telefonos = [];
    if (configFacturacion.telefonos && configFacturacion.telefonos.length > 0 && configFacturacion.telefonos[0]) {
      telefonos.push(configFacturacion.telefonos[0]);
    }
    if (configFacturacion.telefono2 && configFacturacion.telefono2.trim()) {
      telefonos.push(configFacturacion.telefono2);
    }
    const lineaTelefonos = telefonos.length > 0 ? `TEL: ${telefonos.join(' - ')}` : '';

    // Construir línea de ubicación (departamento + ciudad)
    const ubicacionParts = [];
    if (configFacturacion.departamento) ubicacionParts.push(configFacturacion.departamento);
    if (configFacturacion.ciudad) ubicacionParts.push(configFacturacion.ciudad);
    const lineaUbicacion = ubicacionParts.length > 0 ? ubicacionParts.join(' - ') : (configFacturacion.ubicacion_geografica || '');
    
    const reciboContent = `
================================
${centrarTexto(configFacturacion.nombre_empresa)}
${centrarTexto(`CC./NIT.: ${configFacturacion.nit}`)}
${centrarTexto(configFacturacion.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA')}
${centrarTexto(configFacturacion.direccion)}
${lineaUbicacion ? centrarTexto(lineaUbicacion) : ''}
${lineaTelefonos ? centrarTexto(lineaTelefonos) : ''}
================================
      RECIBO DE PAGO
No. ${numeroFactura}
CAJA 01
${mesaInfo}
FECHA: ${fechaActual.toLocaleDateString('es-CO')} ${fechaActual.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
PAGO: ${factura.metodo_pago.toUpperCase()}
================================
CANT ARTICULO    V.UNIT  TOTAL
--------------------------------
${(factura.comanda.items || []).map((item: any) => {
  const maxLength = 12;
  const nombre = item.producto.nombre;
  const valorUnitario = item.precio_unitario;
  
  // Si el nombre es corto, usar padding normal
  if (nombre.length <= maxLength) {
    let itemText = `${item.cantidad.toString().padStart(3, ' ')} ${nombre.padEnd(maxLength)} ${valorUnitario.toLocaleString('es-CO').padStart(6, ' ')} ${item.subtotal.toLocaleString('es-CO').padStart(6, ' ')}`;
    
    // Agregar observaciones si existen
    if (item.observaciones) {
      itemText += `\n    Obs: ${item.observaciones}`;
    }
    
    return itemText;
  } else {
    // Si es largo, dividir en múltiples líneas
    const words = nombre.split(' ');
    let currentLine = '';
    let lines = [];
    
    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Primera línea con cantidad, valor unitario y total
    let itemText = `${item.cantidad.toString().padStart(3, ' ')} ${lines[0].padEnd(maxLength)} ${valorUnitario.toLocaleString('es-CO').padStart(6, ' ')} ${item.subtotal.toLocaleString('es-CO').padStart(6, ' ')}`;
    
    // Líneas adicionales del nombre, indentadas
    for (let i = 1; i < lines.length; i++) {
      itemText += `\n    ${lines[i]}`;
    }
    
    // Agregar observaciones si existen
    if (item.observaciones) {
      itemText += `\n    Obs: ${item.observaciones}`;
    }
    
    return itemText;
  }
}).join('\n')}
--------------------------------
${configFacturacion.responsable_iva && configFacturacion.porcentaje_iva ? `SUBTOTAL               ${subtotal.toLocaleString('es-CO').padStart(7, ' ')}
IVA (${configFacturacion.porcentaje_iva}%)            ${iva.toLocaleString('es-CO').padStart(7, ' ')}
--------------------------------
` : ''}VLR TOTAL              ${total.toLocaleString('es-CO').padStart(7, ' ')}
================================
PAGO: ${factura.metodo_pago.toUpperCase()}

TOTAL                  ${total.toLocaleString('es-CO').padStart(7, ' ')}
PAGO                   ${factura.monto_pagado.toLocaleString('es-CO').padStart(7, ' ')}
CAMBIO                 ${factura.cambio.toLocaleString('es-CO').padStart(7, ' ')}
================================
   GRACIAS POR SU COMPRA
      VUELVA PRONTO
================================
    `;

    // Navegar a la página de recibo con los datos (usando base64 para evitar problemas con caracteres especiales)
    const reciboData = btoa(unescape(encodeURIComponent(reciboContent)));
    window.open(`/recibo?data=${reciboData}`, '_blank');
  };

  const actualizarEstadoComanda = async (comandaId: string, nuevoEstado: EstadoComanda) => {
    try {
      await apiService.actualizarEstadoComanda(comandaId, nuevoEstado);
      await cargarComandasActivas();
      
      // Si el nuevo estado es 'lista', auto-seleccionar la comanda
      if (nuevoEstado === 'lista') {
        const comandasActualizadas = await apiService.getComandasActivas();
        const comandaActualizada = comandasActualizadas.find(c => c.id === comandaId);
        if (comandaActualizada) {
          setComandaSeleccionada(comandaActualizada);
        }
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar el estado de la comanda');
    }
  };

  const getEstadoColor = (estado: EstadoComanda): string => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'preparando': return 'bg-blue-100 text-blue-800';
      case 'lista': return 'bg-green-100 text-green-800';
      case 'entregada': return 'bg-gray-100 text-gray-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      case 'facturada': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoIcon = (estado: EstadoComanda) => {
    switch (estado) {
      case 'pendiente': return <Clock size={16} />;
      case 'preparando': return <AlertCircle size={16} />;
      case 'lista': return <CheckCircle size={16} />;
      case 'entregada': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando comandas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-4">
          {error}
          <button 
            onClick={cargarComandasActivas}
            className="block mx-auto mt-2 btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-800">Interfaz de Caja</h1>
        <button
          onClick={cargarComandasActivas}
          className="btn-secondary"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de comandas activas */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Comandas Activas ({comandasActivas.length})
          </h2>
          
          {comandasActivas.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No hay comandas activas
            </p>
          ) : (
            <div className="space-y-6">
              {/* Agrupar comandas por salón */}
              {(() => {
                // Agrupar comandas por salón o tipo especial
                const comandasPorSalon = comandasActivas.reduce((acc: { [key: string]: Comanda[] }, comanda) => {
                  let clave: string;
                  
                  if (comanda.tipo_pedido === 'domicilio' || comanda.tipo_pedido === 'llevar') {
                    clave = esParaLlevar(comanda) ? '🛍️ Para Llevar' : '🏠 Domicilios';
                  } else if (comanda.mesas && Array.isArray(comanda.mesas) && comanda.mesas.length > 0) {
                    // Usar el salón de la primera mesa
                    clave = comanda.mesas[0].salon;
                  } else {
                    clave = 'Sin salón';
                  }
                  
                  if (!acc[clave]) {
                    acc[clave] = [];
                  }
                  acc[clave].push(comanda);
                  return acc;
                }, {});

                // Ordenar las claves para mostrar domicilios al final
                const clavesOrdenadas = Object.keys(comandasPorSalon).sort((a, b) => {
                  if (a.startsWith('🏠') || a.startsWith('🛍️')) return 1;
                  if (b.startsWith('🏠') || b.startsWith('🛍️')) return -1;
                  return a.localeCompare(b);
                });

                return clavesOrdenadas.map((salon) => (
                  <div key={salon} className="border rounded-lg p-4 bg-secondary-25">
                    <h3 className="font-semibold text-lg text-secondary-800 mb-3 border-b pb-2">
                      {salon}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {comandasPorSalon[salon].map((comanda) => (
                        <div
                          key={comanda.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            comandaSeleccionada?.id === comanda.id
                              ? 'border-primary-500 bg-primary-50 shadow-md'
                              : 'border-secondary-200 bg-white hover:border-secondary-300 hover:shadow'
                          }`}
                          onClick={() => setComandaSeleccionada(comanda)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              {comanda.tipo_pedido === 'domicilio' || comanda.tipo_pedido === 'llevar' ? (
                                <>
                                  <h4 className="font-semibold text-sm text-secondary-800 truncate">
                                    {getNombreCliente(comanda)}
                                  </h4>
                                  {parseDatosCliente(comanda)?.telefono && (
                                    <p className="text-xs text-secondary-600">
                                      📞 {parseDatosCliente(comanda).telefono}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <h4 className="font-semibold text-sm text-secondary-800">
                                    {Array.isArray(comanda.mesas) ? comanda.mesas.map(m => m.numero).join(', ') : 'Sin mesa'}
                                  </h4>
                                </>
                              )}
                              <p className="text-xs text-secondary-500 truncate">
                                Atendido por: {comanda.usuario_nombre || comanda.mesero}
                              </p>
                            </div>
                            <div className="flex flex-col items-end space-y-1 ml-2">
                              <div className={`px-1.5 py-0.5 rounded text-[12px] font-medium flex items-center space-x-0.5 ${getEstadoColor(comanda.estado)}`}>
                                {getEstadoIcon(comanda.estado)}
                                <span>{comanda.estado === 'pendiente' ? 'Pendiente' : comanda.estado === 'preparando' ? 'Preparando' : 'Lista'}</span>
                              </div>
                              {facturasImpresas.has(comanda.id) && (
                                <div className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[12px] font-medium">
                                  ✓ Facturado
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-secondary-600">
                              {comanda.items?.length || 0} item(s)
                            </span>
                            <span className="text-sm font-bold text-primary-600">
                              ${comanda.total.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex space-x-1 mt-2">
                            {comanda.estado === 'pendiente' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actualizarEstadoComanda(comanda.id, 'preparando');
                                }}
                                className="text-yellow-600 hover:text-yellow-800 text-[12px] px-1.5 py-0.5 border border-yellow-600 rounded flex-1"
                              >
                                Preparando
                              </button>
                            )}
                            
                            {comanda.estado === 'preparando' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actualizarEstadoComanda(comanda.id, 'lista');
                                }}
                                className="text-green-600 hover:text-green-800 text-[12px] px-1.5 py-0.5 border border-green-600 rounded flex-1"
                              >
                                Marcar Lista
                              </button>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setComandaACancelar(comanda);
                                setMostrarModalCancelar(true);
                              }}
                              className="px-2 py-1 bg-red-200 text-white text-xs rounded hover:bg-red-400 transition-colors"
                              title="Cancelar comanda"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Detalle de comanda seleccionada */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Procesar Pago
          </h2>
          
          {!comandaSeleccionada ? (
            <p className="text-secondary-600 text-center py-8">
              Selecciona una comanda para procesar el pago
            </p>
          ) : (
            <div className="space-y-4">
              <div className="bg-secondary-50 p-4 rounded-lg">
                {comandaSeleccionada.tipo_pedido === 'domicilio' || comandaSeleccionada.tipo_pedido === 'llevar' ? (
                  <>
                    <h3 className="font-semibold text-secondary-800 mb-2 flex items-center">
                      {esParaLlevar(comandaSeleccionada) ? '🛍️ Para Llevar' : '🚚 Domicilio'}
                      <span className="ml-2">- {getNombreCliente(comandaSeleccionada)}</span>
                    </h3>
                    {parseDatosCliente(comandaSeleccionada)?.telefono && (
                      <p className="text-sm text-secondary-600">
                        📞 Teléfono: {parseDatosCliente(comandaSeleccionada).telefono}
                      </p>
                    )}
                    {!esParaLlevar(comandaSeleccionada) && parseDatosCliente(comandaSeleccionada)?.direccion && (
                      <p className="text-sm text-secondary-600">
                        📍 Dirección: {parseDatosCliente(comandaSeleccionada).direccion}
                      </p>
                    )}
                    {esParaLlevar(comandaSeleccionada) && (
                      <p className="text-xs text-green-600 mt-1">
                        ⚠️ Cliente recoge en el restaurante
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-secondary-800 mb-2">
                      Mesas: {comandaSeleccionada.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                    </h3>
                  </>
                )}
                <p className="text-sm text-secondary-600">
                  Atendido por: {comandaSeleccionada.usuario_nombre || comandaSeleccionada.mesero}
                </p>
                <p className="text-sm text-secondary-600">
                  Fecha: {(() => {
                    try {
                      // Usar fecha_apertura si fecha_creacion no está disponible
                      const fechaStr = comandaSeleccionada.fecha_creacion || comandaSeleccionada.fecha_apertura;
                      if (!fechaStr) return 'Fecha no disponible';
                      
                      const fecha = new Date(fechaStr);
                      return isNaN(fecha.getTime()) ? 'Fecha inválida' : fecha.toLocaleString('es-CO');
                    } catch (e) {
                      return 'Error en fecha';
                    }
                  })()}
                </p>
                {comandaSeleccionada.observaciones_generales && (
                  <div className="mt-2 pt-2 border-t border-secondary-200">
                    <p className="text-xs font-medium text-secondary-700">Observaciones generales:</p>
                    <p className="text-xs text-secondary-600 italic">{comandaSeleccionada.observaciones_generales}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-secondary-800">Items:</h4>
                  <button
                    onClick={() => marcarTodosComoNoPagados(comandaSeleccionada.id)}
                    className="text-xs text-primary-600 hover:text-primary-700 underline"
                    title="Desmarcar todos los items"
                  >
                    Limpiar selección
                  </button>
                </div>
                <div className="space-y-3">
                  {comandaSeleccionada.items && comandaSeleccionada.items.length > 0 ? (
                    comandaSeleccionada.items.map((item) => {
                      const itemYaPagado = isItemPagado(comandaSeleccionada.id, item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`border-l-2 pl-3 py-2 transition-all ${
                            itemYaPagado 
                              ? 'border-green-300 bg-green-50 opacity-60' 
                              : 'border-primary-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={itemYaPagado}
                              onChange={() => toggleItemPagado(comandaSeleccionada.id, item.id)}
                              className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-secondary-300 rounded cursor-pointer"
                              title={itemYaPagado ? 'Item ya pagado - click para desmarcar' : 'Marcar como pagado'}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between text-sm">
                                <span className={`font-medium ${itemYaPagado ? 'line-through text-secondary-500' : ''}`}>
                                  {item.producto.nombre} x {item.cantidad} <span className="text-xs text-neutral-500">({item.precio_unitario ? `$${item.precio_unitario.toLocaleString()}` : '—'})</span>
                                </span>
                                <span className={`font-semibold ${itemYaPagado ? 'line-through text-secondary-500' : ''}`}>
                                  ${item.subtotal.toLocaleString()}
                                </span>
                              </div>
                          
                              {/* Mostrar personalización */}
                              {item.personalizacion && Object.keys(item.personalizacion).length > 0 && (
                                <div className={`mt-1 space-y-0.5 ${itemYaPagado ? 'opacity-70' : ''}`}>
                              {(() => {
                                // Ordenar las entradas según el orden de las categorías
                                const entradasOrdenadas = ordenarPersonalizaciones(item.personalizacion);
                                
                                return entradasOrdenadas.map(([key, value]: [string, any]) => {
                                  // key es el ID de la categoría, value es el ID del item seleccionado
                                  const categoriaId = key;
                                  const itemId = value;
                                  
                                  // Buscar la categoría por ID
                                  const categoria = categoriasPersonalizacion.find((cat: any) => cat.id === categoriaId);
                                  if (!categoria) return null;
                                  
                                  // Buscar el item en los items de esa categoría
                                  const itemsDeCategoria = itemsPersonalizacion[categoriaId] || [];
                                  const itemSeleccionado = itemsDeCategoria.find((it: any) => it.id === itemId);
                                  
                                  if (!itemSeleccionado) return null;
                                  
                                  // Limpiar el nombre removiendo espacios y números al final si existen
                                  const nombreLimpio = itemSeleccionado.nombre.trim();
                                  
                                  return (
                                    <div key={key} className="text-xs text-secondary-600">
                                      <span className="font-medium">{categoria.nombre}:</span>{' '}
                                      <span>{nombreLimpio}</span>
                                      {Number(itemSeleccionado.precio_adicional) > 0 && (
                                        <span className="text-primary-600 ml-1">
                                          (+${Number(itemSeleccionado.precio_adicional).toLocaleString()})
                                        </span>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                          
                              {/* Mostrar observaciones del item */}
                              {item.observaciones && (
                                <div className={`mt-1 ${itemYaPagado ? 'opacity-70' : ''}`}>
                                  <p className={`text-xs text-amber-700 italic ${itemYaPagado ? 'line-through' : ''}`}>
                                    📝 {item.observaciones}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-secondary-500 italic">No hay items en esta comanda</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 mb-4">
                  {(() => {
                    const totalPendiente = calcularTotalPendiente(comandaSeleccionada);
                    const totalPagado = comandaSeleccionada.total - totalPendiente;
                    const hayItemsPagados = totalPagado > 0;
                    
                    return (
                      <>
                        {hayItemsPagados && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-secondary-600">Total original:</span>
                            <span className="text-secondary-600">
                              ${comandaSeleccionada.total.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {hayItemsPagados && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-green-600">Ya pagado:</span>
                            <span className="text-green-600 line-through">
                              ${totalPagado.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">
                            {hayItemsPagados ? 'Total pendiente:' : 'Total:'}
                          </span>
                          <span className="text-xl font-bold text-primary-600">
                            ${totalPendiente.toLocaleString()}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Método de Pago:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setMetodoPago('efectivo')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'efectivo'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <DollarSign size={20} />
                      <span>Efectivo</span>
                    </button>
                    <button
                      onClick={() => setMetodoPago('transferencia')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'transferencia'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <Smartphone size={20} />
                      <span>Transferencia</span>
                    </button>
                    <button
                      onClick={() => setMetodoPago('tarjeta')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'tarjeta'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <CreditCard size={20} />
                      <span>Tarjeta</span>
                    </button>
                    
                    {/* <button
                      onClick={() => setMetodoPago('mixto')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'mixto'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <Receipt size={20} />
                      <span>Mixto</span>
                    </button> */}
                  </div>
                </div>

                {metodoPago === 'efectivo' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Billetes rápidos:
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].map((valor) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => {
                            const montoActual = parseFloat(montoPagado) || 0;
                            setMontoPagado((montoActual + valor).toString());
                          }}
                          className="px-2 py-1.5 text-normal hover:border-primary-500 hover:text-primary-700 border border-secondary-300 rounded hover:bg-secondary-100 transition-colors"
                        >
                          ${(valor / 1000)}k
                        </button>
                      ))}
                    </div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Monto Pagado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={montoPagado}
                        onChange={(e) => setMontoPagado(e.target.value)}
                        placeholder={`Mínimo: $${calcularTotalPendiente(comandaSeleccionada).toLocaleString()}`}
                        className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMontoPagado(calcularTotalPendiente(comandaSeleccionada).toString())}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors whitespace-nowrap"
                        title="Pago exacto"
                      >
                        💰 Exacto
                      </button>
                    </div>
                    {cambio > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Cambio: ${cambio.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={generarFactura}
                    className="btn-secondary flex-1"
                  >
                    📄 Generar Factura
                  </button>
                  <button
                    onClick={procesarFactura}
                    disabled={
                      procesandoPago || 
                      comandaSeleccionada.estado !== 'lista' || 
                      (metodoPago === 'efectivo' && calcularTotalPendiente(comandaSeleccionada) > 0 && (!montoPagado || parseFloat(montoPagado) < calcularTotalPendiente(comandaSeleccionada)))
                    }
                    className="btn-primary flex-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {procesandoPago ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      'Procesar Pago y Liberar Mesa'
                    )}
                  </button>
                </div>

                {comandaSeleccionada.estado !== 'lista' && (
                  <p className="text-sm text-yellow-600 mt-2 text-center">
                    La comanda debe estar "lista" para procesar el pago
                  </p>
                )}

                {metodoPago === 'efectivo' && montoPagado && parseFloat(montoPagado) < calcularTotalPendiente(comandaSeleccionada) && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    El monto pagado debe ser mayor o igual al total pendiente
                  </p>
                )}
                
                {getItemsPendientes(comandaSeleccionada).length === 0 && (
                  <p className="text-sm text-green-600 mt-2 text-center">
                    ✅ Todos los items marcados. Listo para liberar mesa.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para imprimir recibo */}
      {mostrarModalRecibo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-secondary-800 mb-4">
              ✅ Pago Procesado Exitosamente
            </h3>
            <p className="text-secondary-600 mb-6">
              ¿Desea imprimir el recibo para entregar al cliente?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  generarRecibo(facturaParaRecibo);
                  setMostrarModalRecibo(false);
                  setFacturaParaRecibo(null);
                }}
                className="btn-primary flex-1"
              >
                🖨️ Sí, imprimir recibo
              </button>
              <button
                onClick={() => {
                  setMostrarModalRecibo(false);
                  setFacturaParaRecibo(null);
                }}
                className="btn-secondary flex-1"
              >
                No, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cancelar comanda */}
      {mostrarModalCancelar && comandaACancelar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              ⚠️ Cancelar Comanda
            </h3>
            <div className="mb-6">
              <p className="text-secondary-700 mb-2">
                ¿Está seguro que desea cancelar esta comanda?
              </p>
              <div className="bg-secondary-50 p-3 rounded-lg mt-3">
                {comandaACancelar.tipo_pedido === 'domicilio' || comandaACancelar.tipo_pedido === 'llevar' ? (
                  <p className="text-sm">
                    <strong>{esParaLlevar(comandaACancelar) ? '🛍️ Para Llevar' : '🚚 Domicilio'}:</strong> {getNombreCliente(comandaACancelar)}
                  </p>
                ) : (
                  <p className="text-sm">
                    <strong>Mesa(s):</strong> {comandaACancelar.mesas?.map(m => `${m.salon}-${m.numero}`).join(', ')}
                  </p>
                )}
                <p className="text-sm mt-1">
                  <strong>Total:</strong> ${comandaACancelar.total.toLocaleString()}
                </p>
                <p className="text-sm">
                  <strong>Items:</strong> {comandaACancelar.items?.length || 0}
                </p>
              </div>
              <p className="text-sm text-red-600 mt-3">
                Esta acción liberará la mesa y marcará la comanda como cancelada.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setMostrarModalCancelar(false);
                  setComandaACancelar(null);
                }}
                className="btn-secondary flex-1"
              >
                No, volver
              </button>
              <button
                onClick={cancelarComanda}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors flex-1"
              >
                Sí, cancelar comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
