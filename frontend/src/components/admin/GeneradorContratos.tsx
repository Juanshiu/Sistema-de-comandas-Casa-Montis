
import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { Empleado, ContratoDetails, ContratoHistorico } from '@/types';
import { 
  FileText, 
  User, 
  Calendar, 
  Briefcase,
  DollarSign,
  Clock,
  MapPin,
  Download,
  History,
  RefreshCw,
  Printer,
  Trash2
} from 'lucide-react';

const GeneradorContratos: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fetchingHistorial, setFetchingHistorial] = useState(false);
  const [historial, setHistorial] = useState<ContratoHistorico[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | ''>('');
  const [contratoUrl, setContratoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initial Form State
  const initialFormState: ContratoDetails = {
    TIPO_CONTRATO: 'TÉRMINO FIJO INFERIOR A UN (1) AÑO',
    DURACION_CONTRATO: '6 MESES',
    FECHA_INICIO: new Date().toISOString().split('T')[0],
    FECHA_FIN: '',
    PERIODO_PRUEBA: '2 MESES',
    DIAS_LABORADOS: 'LUNES A SÁBADO',
    HORARIO_TRABAJO: '8:00 AM - 5:00 PM',
    FORMA_PAGO: 'TRANSFERENCIA BANCARIA',
    PERIODO_PAGO: 'QUINCENAL',
    FECHAS_PAGO: '15 Y 30 DE CADA MES',
    LUGAR_FIRMA: 'PALERMO, HUILA',
    FECHA_FIRMA: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState<ContratoDetails>(initialFormState);

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEmpleados();
      // Filter active employees only
      const activos = data.filter(e => e.estado === 'ACTIVO');
      setEmpleados(activos);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async (empleadoId: number) => {
    try {
      setFetchingHistorial(true);
      const data = await apiService.getContratosHistorial(empleadoId);
      setHistorial(data);
    } catch (err) {
      console.error('Error fetching contract history:', err);
      // Not setting global error here to avoid blocking the UI
    } finally {
      setFetchingHistorial(false);
    }
  };

  const handleEmpleadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedEmpleadoId(id);
    setContratoUrl(null);
    setSuccess(null);
    setError(null);
    setHistorial([]);

    if (id) {
      fetchHistorial(id);
    }

    // Auto-fill some data based on employee if needed in the future
    const empleado = empleados.find(emp => emp.id === id);
    if (empleado) {
        // Pre-fill some defaults or specific data
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpleadoId) {
      setError('Por favor seleccione un empleado');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      setContratoUrl(null);

      const response = await apiService.generarContrato(selectedEmpleadoId, formData);
      
      if (response.success) {
        setSuccess('Contrato generado correctamente');
        // Construct full download URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const baseUrl = apiUrl.replace('/api', ''); // http://localhost:3001
        setContratoUrl(`${baseUrl}${response.url}`);
        
        // Refresh history
        if (selectedEmpleadoId) {
          fetchHistorial(selectedEmpleadoId);
        }
      }
    } catch (err: any) {
      console.error('Error generating contract:', err);
      setError(err.response?.data?.error || 'Error al generar el contrato');
    } finally {
      setGenerating(false);
    }
  };

  const handleReprint = (contrato: ContratoHistorico) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace('/api', '');
    const url = `${baseUrl}/api/contratos/download/${contrato.file_name}`;
    window.open(url, '_blank');
  };

  const handleRenew = (contrato: ContratoHistorico) => {
    // Load data from historical contract into form
    setFormData({
      ...contrato.contrato_details,
      FECHA_INICIO: new Date().toISOString().split('T')[0], // Reset to today for renewal
      FECHA_FIRMA: new Date().toISOString().split('T')[0]
    });
    setSuccess(`Datos del contrato "${contrato.tipo_contrato}" cargados para renovación.`);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este contrato? Esta acción no se puede deshacer y borrará el archivo PDF permanentemente.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteContrato(id);
      setSuccess('Contrato eliminado correctamente');
      if (selectedEmpleadoId) {
        fetchHistorial(selectedEmpleadoId);
      }
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setError(err.response?.data?.error || 'Error al eliminar el contrato');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpleado = empleados.find(e => e.id === selectedEmpleadoId);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-6 border-b pb-4">
        <FileText className="h-8 w-8 text-indigo-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Generador de Contratos Laborales</h2>
          <p className="text-gray-500 text-sm">Crea contratos en PDF automáticamente con los datos del sistema</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
              {contratoUrl && (
                <div className="mt-2">
                  <a 
                    href={contratoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Descargar Contrato PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Selección y Detalles */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Empleado */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-indigo-500" />
                1. Selección de Empleado
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Empleado</label>
                  <select
                    value={selectedEmpleadoId}
                    onChange={handleEmpleadoChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="">Seleccione un empleado...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombres} {emp.apellidos} - {emp.numero_documento}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedEmpleado && (
                  <div className="bg-white p-3 rounded border text-sm text-gray-600 flex justify-between items-center">
                    <div>
                      <p><strong>Cargo:</strong> {selectedEmpleado.cargo}</p>
                      <p><strong>Documento:</strong> {selectedEmpleado.numero_documento}</p>
                    </div>
                    <div>
                      <p><strong>Salario Base:</strong> ${selectedEmpleado.salario_base.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles del Contrato */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-indigo-500" />
                2. Detalles del Contrato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo y Duración */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Contrato</label>
                  <input
                    type="text"
                    name="TIPO_CONTRATO"
                    value={formData.TIPO_CONTRATO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duración</label>
                  <input
                    type="text"
                    name="DURACION_CONTRATO"
                    value={formData.DURACION_CONTRATO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Período de Prueba</label>
                  <input
                    type="text"
                    name="PERIODO_PRUEBA"
                    value={formData.PERIODO_PRUEBA}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                  <input
                    type="date"
                    name="FECHA_INICIO"
                    value={formData.FECHA_INICIO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                  <input
                    type="date"
                    name="FECHA_FIN"
                    value={formData.FECHA_FIN}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Días Laborados</label>
                  <input
                    type="text"
                    name="DIAS_LABORADOS"
                    value={formData.DIAS_LABORADOS}
                    onChange={handleInputChange}
                    placeholder="Ej: Lunes a Sábado"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Horario y Pagos */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Horario de Trabajo</label>
                  <input
                    type="text"
                    name="HORARIO_TRABAJO"
                    value={formData.HORARIO_TRABAJO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
                  <input
                    type="text"
                    name="FORMA_PAGO"
                    value={formData.FORMA_PAGO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Período de Pago</label>
                  <input
                    type="text"
                    name="PERIODO_PAGO"
                    value={formData.PERIODO_PAGO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Fechas de Pago</label>
                  <input
                    type="text"
                    name="FECHAS_PAGO"
                    value={formData.FECHAS_PAGO}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Firma */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lugar de Firma</label>
                  <input
                    type="text"
                    name="LUGAR_FIRMA"
                    value={formData.LUGAR_FIRMA}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Firma</label>
                  <input
                    type="date"
                    name="FECHA_FIRMA"
                    value={formData.FECHA_FIRMA}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={generating || !selectedEmpleadoId}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                  generating || !selectedEmpleadoId ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {generating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando Contrato...
                  </>
                ) : (
                  'Generar Contrato'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Historial */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 h-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <History className="h-5 w-5 mr-2 text-indigo-500" />
              Historial de Contratos
            </h3>
            
            {fetchingHistorial ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : historial.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo/Inicio-Fin</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historial.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          <div className="font-medium text-gray-900 truncate max-w-[180px]" title={c.tipo_contrato}>
                            {c.tipo_contrato}
                          </div>
                          <div>
                            {c.fecha_inicio} {c.fecha_fin ? `al ${c.fecha_fin}` : '(Indefinido)'}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex flex-col space-y-1 items-end">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReprint(c)}
                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                                title="Reimprimir"
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Imprimir
                              </button>
                              <button
                                onClick={() => handleRenew(c)}
                                className="text-green-600 hover:text-green-900 inline-flex items-center"
                                title="Renovar"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Renovar
                              </button>
                            </div>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 italic">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">
                  {selectedEmpleadoId 
                    ? "No hay contratos registrados para este empleado." 
                    : "Seleccione un empleado para ver su historial."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneradorContratos;
