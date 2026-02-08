import React, { useState, useEffect } from 'react';
import { Empleado, Liquidacion } from '../../types';
import { apiService } from '../../services/api';
import { Calculator, User, Calendar, DollarSign, AlertCircle, FileText, Download } from 'lucide-react';

const GestionLiquidacion: React.FC = () => {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string>('');
    const [fechaRetiro, setFechaRetiro] = useState(new Date().toISOString().split('T')[0]);
    const [motivoRetiro, setMotivoRetiro] = useState('RENUNCIA_VOLUNTARIA');
    const [baseManual, setBaseManual] = useState<number>(0);
    const [salarioFijo, setSalarioFijo] = useState(true);
    const [promedio12Meses, setPromedio12Meses] = useState<number>(0);
    const [incluirAuxTransp, setIncluirAuxTransp] = useState(true);
    const [diasVacaciones, setDiasVacaciones] = useState<number | undefined>(undefined);
    const [diasPrima, setDiasPrima] = useState<number | undefined>(undefined);
    const [diasCesantias, setDiasCesantias] = useState<number | undefined>(undefined);
    const [diasSueldo, setDiasSueldo] = useState<number | undefined>(undefined);
    
    
    const [loading, setLoading] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [resultado, setResultado] = useState<any | null>(null);

    useEffect(() => {
        const cargarEmpleados = async () => {
            try {
                const data = await apiService.getEmpleadosActivos();
                setEmpleados(data);
            } catch (error) {
                console.error('Error cargando empleados:', error);
            }
        };
        cargarEmpleados();
    }, []);

    const descargarPDF = async () => {
        if (!resultado) return;
        try {
            setDescargando(true);
            const blob = await apiService.generarPDFLiquidacion(resultado);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Liquidacion_${resultado.empleado_id}_${new Date().getTime()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            alert('Error al generar el PDF de liquidación');
        } finally {
            setDescargando(false);
        }
    };

    const handleCalcular = async () => {
        if (!selectedEmpleadoId) return alert('Seleccione un empleado');
        setLoading(true);
        try {
            const res = await apiService.calcularLiquidacion(
                selectedEmpleadoId,
                fechaRetiro, // Pasar el string YYYY-MM-DD directamente
                motivoRetiro,
                {
                    base_liquidacion_manual: baseManual > 0 ? baseManual : undefined,
                    salario_fijo: salarioFijo,
                    promedio_12_meses: !salarioFijo ? promedio12Meses : undefined,
                    incluir_auxilio_transporte: incluirAuxTransp,
                    dias_vacaciones: diasVacaciones,
                    dias_prima: diasPrima,
                    dias_cesantias: diasCesantias,
                    dias_sueldo_pendientes: diasSueldo
                }
            );
            setResultado(res);
        } catch (error) {
            console.error('Error calculando liquidación:', error);
            alert('Error al calcular la liquidación.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string | Date) => {
        if (!dateStr) return 'N/A';
        if (dateStr instanceof Date) return dateStr.toLocaleDateString();
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return new Date(dateStr).toLocaleDateString();
    };

    const selectedEmpleado = empleados.find(e => e.id === selectedEmpleadoId);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Liquidación de Prestaciones Sociales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario */}
                <div className="md:col-span-1 space-y-4 bg-white p-6 rounded-lg shadow-sm border">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                        <select 
                            className="w-full border rounded-md p-2"
                            value={selectedEmpleadoId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedEmpleadoId(id);
                                setResultado(null);
                                
                                // Sincronizar Aux Transporte con el empleado
                                const emp = empleados.find(emp => emp.id === id);
                                if (emp) {
                                    setIncluirAuxTransp(emp.auxilio_transporte);
                                }
                            }}
                        >
                            <option value="">Seleccione...</option>
                            {empleados.map(e => (
                                <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
                            ))}
                        </select>
                    </div>

                    {selectedEmpleado && (
                        <div className="bg-blue-50 p-3 rounded-md text-xs space-y-1">
                            <p><strong>Cargo:</strong> {selectedEmpleado.cargo}</p>
                            <p><strong>Contrato:</strong> {selectedEmpleado.tipo_contrato}</p>
                            <p><strong>Fecha Ingreso:</strong> {formatDate(selectedEmpleado.fecha_inicio)}</p>
                            <p><strong>Sueldo Base:</strong> ${selectedEmpleado.salario_base.toLocaleString()}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Retiro</label>
                        <input 
                            type="date"
                            className="w-full border rounded-md p-2"
                            value={fechaRetiro}
                            onChange={(e) => setFechaRetiro(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Retiro</label>
                        <select 
                            className="w-full border rounded-md p-2"
                            value={motivoRetiro}
                            onChange={(e) => setMotivoRetiro(e.target.value)}
                        >
                            <option value="RENUNCIA_VOLUNTARIA">Renuncia Voluntaria</option>
                            <option value="TERM_CONTRATO_JUSTA_CAUSA">Terminación con Justa Causa</option>
                            <option value="DESPIDO_SIN_JUSTA_CAUSA">Despido Sin Justa Causa (Indemnización)</option>
                            <option value="MUTUO_ACUERDO">Mutuo Acuerdo</option>
                        </select>
                    </div>

                    {motivoRetiro === 'DESPIDO_SIN_JUSTA_CAUSA' && (
                        <>
                            {selectedEmpleado?.es_periodo_prueba && 
                             selectedEmpleado.fecha_fin_periodo_prueba && 
                             fechaRetiro <= selectedEmpleado.fecha_fin_periodo_prueba ? (
                                <div className="p-3 bg-red-100 border border-red-200 rounded-md flex gap-2">
                                    <AlertCircle size={16} className="text-red-700 shrink-0" />
                                    <p className="text-[10px] font-bold text-red-800 uppercase">
                                        Empleado en período de prueba: No hay lugar a indemnización (Art. 76 CST).
                                    </p>
                                </div>
                             ) : (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md animate-pulse">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={14} className="text-amber-700" />
                                        <span className="text-[10px] font-bold text-amber-800 uppercase">Información Legal (Ley 789)</span>
                                    </div>
                                    <p className="text-[10px] text-amber-700 leading-tight">
                                        <strong>Contrato Indefinido:</strong> 30 días (año 1) + 20 días (subsiguientes) si gana &lt; 10 SMMLV. 
                                        20 días (año 1) + 15 días (subsiguientes) si gana &ge; 10 SMMLV.
                                        <strong> Contrato Fijo:</strong> Salarios faltantes hasta el vencimiento.
                                    </p>
                                </div>
                             )}
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Salario</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSalarioFijo(true)}
                                className={`flex-1 py-2 text-xs rounded border ${salarioFijo ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600'}`}
                            >
                                Fijo
                            </button>
                            <button 
                                onClick={() => setSalarioFijo(false)}
                                className={`flex-1 py-2 text-xs rounded border ${!salarioFijo ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600'}`}
                            >
                                Variable (Promedio)
                            </button>
                        </div>
                    </div>

                    {!salarioFijo && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Promedio últimos 12 meses</label>
                            <input 
                                type="number"
                                className="w-full border rounded-md p-2"
                                value={promedio12Meses}
                                onChange={(e) => setPromedio12Meses(parseFloat(e.target.value))}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Días Vac.</label>
                            <input type="number" className="w-full border rounded p-1 text-sm" value={diasVacaciones || ''} onChange={e => setDiasVacaciones(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Días Prima</label>
                            <input type="number" className="w-full border rounded p-1 text-sm" value={diasPrima || ''} onChange={e => setDiasPrima(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Días Cesant.</label>
                            <input type="number" className="w-full border rounded p-1 text-sm" value={diasCesantias || ''} onChange={e => setDiasCesantias(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Días Sueldo</label>
                            <input type="number" className="w-full border rounded p-1 text-sm" value={diasSueldo || ''} onChange={e => setDiasSueldo(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Auto" />
                        </div>
                    </div>

                    {motivoRetiro === 'DESPIDO_SIN_JUSTA_CAUSA' && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded text-[11px] text-red-700 flex gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <p><strong>ALERTA LEGAL:</strong> {
                                selectedEmpleado?.es_periodo_prueba && 
                                selectedEmpleado.fecha_fin_periodo_prueba && 
                                fechaRetiro <= selectedEmpleado.fecha_fin_periodo_prueba
                                ? "Esta terminación ocurre en PERÍODO DE PRUEBA. Según el Art. 76 del CST, no se genera derecho a indemnización."
                                : "Esta terminación genera derecho a indemnización según Ley 789/2002. El sistema calculará el valor proporcional."
                            }</p>
                        </div>
                    )}

                    <button
                        onClick={handleCalcular}
                        disabled={loading || !selectedEmpleadoId}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Calculando...' : <><Calculator size={20} /> Calcular Liquidación</>}
                    </button>
                </div>

                {/* Resultado */}
                <div className="md:col-span-2">
                    {resultado ? (
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            <div className="bg-gray-800 p-4 text-white flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2">
                                    <FileText size={20} /> Resumen de Liquidación
                                </h3>
                                <span className="text-xs opacity-75">Días Laborados: {resultado.dias_laborados_total}</span>
                            </div>
                            
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-gray-700 border-b pb-1">Prestaciones Sociales</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Cesantías ({resultado.detalles.cesantias.dias} días)</span>
                                                    <span className="font-medium">${resultado.detalles.cesantias.valor.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Intereses Cesantías</span>
                                                    <span className="font-medium">${resultado.detalles.intereses.valor.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Prima de Servicios ({resultado.detalles.prima.dias} días)</span>
                                                    <span className="font-medium">${resultado.detalles.prima.valor.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Vacaciones ({resultado.detalles.vacaciones.dias} días)</span>
                                                    <span className="font-medium">${resultado.detalles.vacaciones.valor.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {resultado.detalles.salario_pendiente && resultado.detalles.salario_pendiente.valor_bruto > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-gray-700 border-b pb-1">Salario Pendiente (Último Mes)</h4>
                                                <div className="space-y-2 text-sm bg-blue-50/50 p-2 rounded">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600 italic">Sueldo ({resultado.detalles.salario_pendiente.dias} días)</span>
                                                        <span>${resultado.detalles.salario_pendiente.valor_bruto.toLocaleString()}</span>
                                                    </div>
                                                    {resultado.detalles.salario_pendiente.aux_transporte > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600 italic">Auxilio Transporte Prop.</span>
                                                            <span>${resultado.detalles.salario_pendiente.aux_transporte.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-red-600 text-xs">
                                                        <span>Dcto. Salud (4%)</span>
                                                        <span>- ${resultado.detalles.salario_pendiente.salud.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-red-600 text-xs">
                                                        <span>Dcto. Pensión (4%)</span>
                                                        <span>- ${resultado.detalles.salario_pendiente.pension.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold border-t pt-1 mt-1 text-blue-900">
                                                        <span>Neto Pendiente</span>
                                                        <span>${resultado.detalles.salario_pendiente.neto.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-700 border-b pb-1">Otros Conceptos e Indemnización</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Indemnización</span>
                                                <span className={`font-medium ${resultado.detalles.indemnizacion.valor > 0 ? 'text-red-600' : ''}`}>
                                                    ${resultado.detalles.indemnizacion.valor.toLocaleString()}
                                                </span>
                                            </div>
                                            {resultado.detalles.indemnizacion.motivo && (
                                                <p className="text-[10px] text-gray-500 italic text-right">{resultado.detalles.indemnizacion.motivo}</p>
                                            )}
                                            
                                            <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Base de Cálculo ({resultado.bases.es_salario_variable ? 'Variable' : 'Fija'})</p>
                                                <p className="text-lg font-bold text-gray-800">${resultado.bases.base_prestaciones.toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-400">Incluye Aux. Transporte: {resultado.bases.incluye_auxilio_transporte ? 'SÍ' : 'NO'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                    <div className="bg-blue-600 p-6 rounded-xl text-white flex justify-between items-center shadow-lg transform hover:scale-[1.01] transition-transform">
                                        <div>
                                            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total a Pagar</p>
                                            <h4 className="text-3xl font-black">${resultado.total_liquidacion.toLocaleString()}</h4>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={descargarPDF}
                                                disabled={descargando}
                                                className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-colors flex items-center gap-2"
                                                title="Descargar PDF"
                                            >
                                                {descargando ? <div className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full" /> : <Download size={24} />}
                                                <span className="font-bold text-sm">DESCARGAR PDF</span>
                                            </button>
                                            <DollarSign size={48} className="opacity-20" />
                                        </div>
                                    </div>

                                <div className="mt-6 flex items-start gap-2 text-xs text-gray-500 p-3 bg-yellow-50 rounded border border-yellow-100">
                                    <AlertCircle size={16} className="text-yellow-600 flex-shrink-0" />
                                    <p>
                                        Este cálculo es informativo y se basa en la normativa legal vigente colombiana.
                                        Debe ser validado por el departamento contable antes de realizar el pago oficial.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 text-gray-400 p-12 text-center">
                            <div>
                                <Calculator size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg">Seleccione un empleado y complete los datos para ver el cálculo de liquidación.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GestionLiquidacion;
