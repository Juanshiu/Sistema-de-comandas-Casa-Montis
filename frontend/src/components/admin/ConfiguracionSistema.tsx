'use client';

import { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2, CheckCircle, XCircle, Coffee, Calendar, FileX } from 'lucide-react';
import apiService from '../../services/api';

export default function ConfiguracionSistema() {
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const [confirmacion1, setConfirmacion1] = useState('');
  const [confirmacion2, setConfirmacion2] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Estados para depuración de nómina
  const [tipoEliminacion, setTipoEliminacion] = useState<'periodo' | 'fecha'>('periodo');
  const [mesEliminacion, setMesEliminacion] = useState('Enero');
  const [anioEliminacion, setAnioEliminacion] = useState(new Date().getFullYear());
  const [fechaInicioEliminacion, setFechaInicioEliminacion] = useState('');
  const [fechaFinEliminacion, setFechaFinEliminacion] = useState('');

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Eliminar Historial de Nómina
  const handleEliminarHistorialNomina = async () => {
    if (confirmacion1 !== 'ELIMINAR NOMINA') {
      alert('Debes escribir "ELIMINAR NOMINA" para confirmar');
      return;
    }

    if (tipoEliminacion === 'fecha' && (!fechaInicioEliminacion || !fechaFinEliminacion)) {
      alert('Debes seleccionar las fechas de inicio y fin');
      return;
    }

    setProcesando(true);
    try {
      const data: any = { tipo: tipoEliminacion };
      
      if (tipoEliminacion === 'periodo') {
        data.periodo_mes = mesEliminacion;
        data.periodo_anio = anioEliminacion;
      } else {
        data.fecha_inicio = fechaInicioEliminacion;
        data.fecha_fin = fechaFinEliminacion;
      }

      const resultado = await apiService.eliminarHistorialNomina(data);
      alert(`✅ ${resultado.message}\nRegistros eliminados: ${resultado.deletedCount}`);
      cerrarModal();
      
    } catch (error: any) {
      console.error('Error:', error);
      alert(`❌ Error al eliminar historial: ${error.response?.data?.error || error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // Resetear Base de Datos
  const handleResetearBaseDatos = async () => {
    if (confirmacion1 !== 'RESETEAR' || confirmacion2 !== 'CONFIRMAR') {
      alert('Debes escribir correctamente las palabras de confirmación');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch('http://localhost:3001/api/sistema/resetear-base-datos', {
        method: 'POST',
      });

      if (response.ok) {
        alert('✅ Base de datos reseteada exitosamente. Se recomienda recargar la página.');
        window.location.reload();
      } else {
        alert('❌ Error al resetear la base de datos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al servidor');
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  // Liberar todas las mesas
  const handleLiberarTodasMesas = async () => {
    if (confirmacion1 !== 'LIBERAR') {
      alert('Debes escribir "LIBERAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch('http://localhost:3001/api/sistema/liberar-mesas', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.mensaje}\n${data.mesasLiberadas} mesa(s) liberada(s)\n${data.comandasEliminadas} comanda(s) eliminada(s)`);
        window.location.reload();
      } else {
        alert(`❌ Error al liberar las mesas: ${data.detalles || data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al servidor');
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  // Limpiar comandas antiguas
  const handleLimpiarComandasAntiguas = async () => {
    if (confirmacion1 !== 'LIMPIAR') {
      alert('Debes escribir "LIMPIAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch('http://localhost:3001/api/sistema/limpiar-comandas-antiguas', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.mensaje}\nComandas: ${data.comandas}\nFacturas: ${data.facturas}`);
      } else {
        alert(`❌ Error al limpiar comandas antiguas: ${data.detalles || data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al servidor');
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  // Limpiar SOLO comandas (todas)
  const handleLimpiarSoloComandas = async () => {
    if (confirmacion1 !== 'ELIMINAR') {
      alert('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch('http://localhost:3001/api/sistema/limpiar-solo-comandas', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.mensaje}\n\nDetalles:\n- Comandas eliminadas: ${data.comandas}\n- Facturas eliminadas: ${data.facturas}\n- Items eliminados: ${data.items}\n- Mesas liberadas: ${data.mesasLiberadas}`);
        window.location.reload();
      } else {
        alert(`❌ Error al limpiar comandas: ${data.detalles || data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión al servidor');
    } finally {
      setProcesando(false);
      cerrarModal();
    }
  };

  const abrirModal = (tipo: string) => {
    setModalAbierto(tipo);
    setConfirmacion1('');
    setConfirmacion2('');
  };

  const cerrarModal = () => {
    setModalAbierto(null);
    setConfirmacion1('');
    setConfirmacion2('');
  };

  const herramientas = [
    {
      id: 'liberar-mesas',
      titulo: 'Liberar Todas las Mesas',
      descripcion: 'Marca todas las mesas como disponibles y elimina todas las comandas activas. Útil para resetear el estado al inicio del día.',
      icon: Coffee,
      color: 'blue',
      peligro: 'medio',
      accion: handleLiberarTodasMesas
    },
    {
      id: 'limpiar-solo-comandas',
      titulo: 'Limpiar SOLO Comandas',
      descripcion: 'Elimina TODAS las comandas y facturas de la base de datos, dejando intactos productos, mesas y personalizaciones. Limpia el historial y reportes completamente.',
      icon: Trash2,
      color: 'orange',
      peligro: 'alto',
      accion: handleLimpiarSoloComandas
    },
    {
      id: 'limpiar-comandas',
      titulo: 'Limpiar Comandas Antiguas',
      descripcion: 'Elimina comandas y facturas con más de 30 días. Ayuda a mantener la base de datos optimizada.',
      icon: RefreshCw,
      color: 'yellow',
      peligro: 'medio',
      accion: handleLimpiarComandasAntiguas
    },
    {
      id: 'eliminar-historial-nomina',
      titulo: 'Depurar Historial de Nómina',
      descripcion: 'Elimina registros de nómina, pagos e historial por periodo o fechas. Útil para correcciones masivas.',
      icon: FileX,
      color: 'red',
      peligro: 'alto',
      accion: handleEliminarHistorialNomina
    },
    {
      id: 'resetear-db',
      titulo: 'Resetear Base de Datos',
      descripcion: '⚠️ PELIGRO: Elimina TODOS los datos (comandas, facturas, productos, etc.). Esta acción NO se puede deshacer.',
      icon: Database,
      color: 'red',
      peligro: 'alto',
      accion: handleResetearBaseDatos
    }
  ];

  const getColorClasses = (color: string, peligro: string) => {
    if (peligro === 'alto') {
      if (color === 'orange') {
        return {
          border: 'border-orange-200 hover:border-orange-300',
          bg: 'bg-orange-50',
          icon: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700 text-white'
        };
      }
      return {
        border: 'border-red-200 hover:border-red-300',
        bg: 'bg-red-50',
        icon: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700 text-white'
      };
    } else if (peligro === 'medio') {
      return {
        border: 'border-yellow-200 hover:border-yellow-300',
        bg: 'bg-yellow-50',
        icon: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
      };
    } else {
      return {
        border: 'border-blue-200 hover:border-blue-300',
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700 text-white'
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con advertencia */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-800 mb-1">
              ⚠️ Zona de Configuración Avanzada
            </h3>
            <p className="text-red-700 text-sm">
              Las herramientas de esta sección pueden afectar datos críticos del sistema.
              Por favor, lee cuidadosamente las descripciones y usa estas funciones con precaución.
              Se recomienda realizar respaldos antes de ejecutar operaciones destructivas.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de herramientas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {herramientas.map((herramienta) => {
          const Icon = herramienta.icon;
          const colors = getColorClasses(herramienta.color, herramienta.peligro);

          return (
            <div
              key={herramienta.id}
              className={`border-2 rounded-lg p-6 transition-all ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-start mb-4">
                <div className={`p-3 rounded-lg bg-white ${colors.icon}`}>
                  <Icon size={24} />
                </div>
                {herramienta.peligro === 'alto' && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      PELIGRO
                    </span>
                  </div>
                )}
                {herramienta.peligro === 'medio' && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      PRECAUCIÓN
                    </span>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-secondary-800 mb-2">
                {herramienta.titulo}
              </h3>

              <p className="text-sm text-secondary-600 mb-4 leading-relaxed">
                {herramienta.descripcion}
              </p>

              <button
                onClick={() => abrirModal(herramienta.id)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${colors.button}`}
              >
                Ejecutar
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación - Liberar Mesas */}
      {modalAbierto === 'liberar-mesas' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Coffee className="h-8 w-8 text-yellow-600 mr-3" />
              <h3 className="text-xl font-bold text-secondary-800">
                Liberar Todas las Mesas
              </h3>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Esta acción marcará todas las mesas como disponibles y eliminará todas las comandas activas (pendientes, en preparación, listas y entregadas).
              </p>
            </div>

            <p className="text-secondary-700 mb-4">
              Para confirmar, escribe la palabra <strong>LIBERAR</strong>:
            </p>

            <input
              type="text"
              value={confirmacion1}
              onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: LIBERAR"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              disabled={procesando}
            />

            <div className="flex space-x-3">
              <button
                onClick={handleLiberarTodasMesas}
                disabled={confirmacion1 !== 'LIBERAR' || procesando}
                className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {procesando ? 'Procesando...' : 'Confirmar'}
              </button>
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - Limpiar Comandas */}
      {modalAbierto === 'limpiar-comandas' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <RefreshCw className="h-8 w-8 text-yellow-600 mr-3" />
              <h3 className="text-xl font-bold text-secondary-800">
                Limpiar Comandas Antiguas
              </h3>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Se eliminarán todas las comandas y facturas con más de 30 días de antigüedad.
                Esto ayuda a mantener la base de datos optimizada.
              </p>
            </div>

            <p className="text-secondary-700 mb-4">
              Para confirmar, escribe la palabra <strong>LIMPIAR</strong>:
            </p>

            <input
              type="text"
              value={confirmacion1}
              onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: LIMPIAR"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              disabled={procesando}
            />

            <div className="flex space-x-3">
              <button
                onClick={handleLimpiarComandasAntiguas}
                disabled={confirmacion1 !== 'LIMPIAR' || procesando}
                className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {procesando ? 'Procesando...' : 'Confirmar'}
              </button>
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - Limpiar SOLO Comandas */}
      {modalAbierto === 'limpiar-solo-comandas' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Trash2 className="h-8 w-8 text-orange-600 mr-3" />
              <h3 className="text-xl font-bold text-orange-800">
                Limpiar SOLO Comandas
              </h3>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
              <p className="text-orange-800 text-sm font-semibold mb-2">
                Esta acción eliminará:
              </p>
              <ul className="text-orange-700 text-sm list-disc list-inside space-y-1">
                <li>TODAS las comandas (activas y antiguas)</li>
                <li>TODAS las facturas</li>
                <li>Todo el historial de ventas</li>
                <li>Todos los datos de reportes</li>
              </ul>
              <p className="text-orange-800 text-sm font-semibold mt-2">
                NO eliminará:
              </p>
              <ul className="text-orange-700 text-sm list-disc list-inside space-y-1">
                <li>Productos</li>
                <li>Mesas y salones</li>
                <li>Personalizaciones</li>
              </ul>
            </div>

            <p className="text-secondary-700 mb-4">
              Para confirmar, escribe la palabra <strong className="text-orange-600">ELIMINAR</strong>:
            </p>

            <input
              type="text"
              value={confirmacion1}
              onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: ELIMINAR"
              className="w-full px-3 py-2 border border-orange-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={procesando}
            />

            <div className="flex space-x-3">
              <button
                onClick={handleLimpiarSoloComandas}
                disabled={confirmacion1 !== 'ELIMINAR' || procesando}
                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {procesando ? 'Eliminando...' : 'Eliminar Todas'}
              </button>
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - Resetear DB (doble confirmación) */}
      {modalAbierto === 'resetear-db' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-bold text-red-800">
                ⚠️ PELIGRO: Resetear Base de Datos
              </h3>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800 text-sm font-semibold mb-2">
                Esta acción es IRREVERSIBLE y eliminará:
              </p>
              <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                <li>Todas las comandas y facturas</li>
                <li>Todos los productos y categorías</li>
                <li>Todas las mesas y salones</li>
                <li>Todas las personalizaciones</li>
                <li>TODO el contenido de la base de datos</li>
              </ul>
            </div>

            <p className="text-secondary-700 mb-2 font-semibold">
              1. Escribe la palabra <strong className="text-red-600">RESETEAR</strong>:
            </p>

            <input
              type="text"
              value={confirmacion1}
              onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: RESETEAR"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={procesando}
            />

            <p className="text-secondary-700 mb-2 font-semibold">
              2. Ahora escribe <strong className="text-red-600">CONFIRMAR</strong>:
            </p>

            <input
              type="text"
              value={confirmacion2}
              onChange={(e) => setConfirmacion2(e.target.value)}
              placeholder="Escribe: CONFIRMAR"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={procesando || confirmacion1 !== 'RESETEAR'}
            />

            <div className="flex space-x-3">
              <button
                onClick={handleResetearBaseDatos}
                disabled={confirmacion1 !== 'RESETEAR' || confirmacion2 !== 'CONFIRMAR' || procesando}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {procesando ? 'Reseteando...' : 'RESETEAR TODO'}
              </button>
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmación - Eliminar Historial Nómina */}
      {modalAbierto === 'eliminar-historial-nomina' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <FileX className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-bold text-red-800">
                Depurar Historial de Nómina
              </h3>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800 text-sm">
                Esta acción eliminará permanentemente las nóminas, pagos y auditorías que coincidan con el criterio seleccionado.
              </p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Eliminación:</label>
                <div className="flex space-x-4 mb-4">
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            checked={tipoEliminacion === 'periodo'} 
                            onChange={() => setTipoEliminacion('periodo')}
                            className="mr-2"
                        />
                        Por Periodo (Mes/Año)
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            checked={tipoEliminacion === 'fecha'} 
                            onChange={() => setTipoEliminacion('fecha')}
                            className="mr-2"
                        />
                        Por Rango de Fechas
                    </label>
                </div>

                {tipoEliminacion === 'periodo' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Mes</label>
                            <select 
                                value={mesEliminacion} 
                                onChange={(e) => setMesEliminacion(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                            >
                                {meses.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Año</label>
                            <input 
                                type="number" 
                                value={anioEliminacion} 
                                onChange={(e) => setAnioEliminacion(parseInt(e.target.value))}
                                className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Desde</label>
                            <input 
                                type="date" 
                                value={fechaInicioEliminacion} 
                                onChange={(e) => setFechaInicioEliminacion(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                            <input 
                                type="date" 
                                value={fechaFinEliminacion} 
                                onChange={(e) => setFechaFinEliminacion(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            <p className="text-secondary-700 mb-2 font-semibold">
              Para confirmar, escribe <strong className="text-red-600">ELIMINAR NOMINA</strong>:
            </p>

            <input
              type="text"
              value={confirmacion1}
              onChange={(e) => setConfirmacion1(e.target.value)}
              placeholder="Escribe: ELIMINAR NOMINA"
              className="w-full px-3 py-2 border border-red-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={procesando}
            />

            <div className="flex space-x-3">
              <button
                onClick={handleEliminarHistorialNomina}
                disabled={confirmacion1 !== 'ELIMINAR NOMINA' || procesando}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {procesando ? 'Eliminando...' : 'Eliminar Historial'}
              </button>
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-secondary-500 text-white px-4 py-2 rounded-md hover:bg-secondary-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
