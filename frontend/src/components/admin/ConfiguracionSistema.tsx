'use client';

import { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2, CheckCircle, XCircle, Coffee } from 'lucide-react';

export default function ConfiguracionSistema() {
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const [confirmacion1, setConfirmacion1] = useState('');
  const [confirmacion2, setConfirmacion2] = useState('');
  const [procesando, setProcesando] = useState(false);

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

      if (response.ok) {
        alert('✅ Todas las mesas han sido liberadas');
      } else {
        alert('❌ Error al liberar las mesas');
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
        alert(`✅ Se eliminaron ${data.eliminadas} comandas con más de 30 días`);
      } else {
        alert('❌ Error al limpiar comandas antiguas');
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
      descripcion: 'Marca todas las mesas como disponibles. Útil para resetear el estado al inicio del día.',
      icon: Coffee,
      color: 'blue',
      peligro: 'medio',
      accion: handleLiberarTodasMesas
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
                Esta acción marcará todas las mesas como disponibles. 
                Las comandas activas NO se eliminarán, pero las mesas quedarán liberadas.
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
    </div>
  );
}
