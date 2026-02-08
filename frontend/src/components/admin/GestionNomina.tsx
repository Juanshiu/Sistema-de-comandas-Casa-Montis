import { useState, useEffect } from 'react';
import { ConfiguracionNomina, Empleado, NominaDetalle, PagoNomina, HistorialNomina } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, DollarSign, FileText, Calculator, Download, Save, Clock, TrendingUp, Info, Lightbulb, BookOpen, AlertTriangle, Calendar, User, CheckCircle } from 'lucide-react';

const GestionNomina: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'run' | 'config' | 'history'>('run');
    const [config, setConfig] = useState<ConfiguracionNomina | null>(null);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(false);

    // Estado para "Correr Nómina"
    const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string>('');
    const [diasTrabajados, setDiasTrabajados] = useState(30);
    const [horasDiurnas, setHorasDiurnas] = useState(0);
    const [horasDom, setHorasDom] = useState(0);
    const [horasFest, setHorasFest] = useState(0);
    const [horasExtraDom, setHorasExtraDom] = useState(0);
    const [comisiones, setComisiones] = useState(0);
    const [otrasDeducciones, setOtrasDeducciones] = useState(0);
    const [mesPeriodo, setMesPeriodo] = useState<string>(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
    const [anioPeriodo, setAnioPeriodo] = useState<number>(new Date().getFullYear());
    const [nominaCalculada, setNominaCalculada] = useState<NominaDetalle | null>(null);
    const [histNominas, setHistNominas] = useState<NominaDetalle[]>([]);
    const [histPagos, setHistPagos] = useState<PagoNomina[]>([]);
    const [histCambios, setHistCambios] = useState<HistorialNomina[]>([]);
    const [selectedHistNominaId, setSelectedHistNominaId] = useState<string | null>(null);
    const [nuevoPagoValor, setNuevoPagoValor] = useState<number>(0);
    const [nuevoPagoFecha, setNuevoPagoFecha] = useState<string>('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);
    const [pagosRegistrados, setPagosRegistrados] = useState<PagoNomina[]>([]);

    const { usuario } = useAuth();

    const MESES = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [configData, empleadosData] = await Promise.all([
                apiService.getConfiguracionNomina().catch(() => null), // Puede fallar si no hay config
                apiService.getEmpleadosActivos()
            ]);
            setConfig(configData);
            setEmpleados(empleadosData);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCalcular = async () => {
        if (!selectedEmpleadoId) return alert('Seleccione un empleado');
        setLoading(true);
        try {
            const calculo = await apiService.calcularNomina(selectedEmpleadoId, diasTrabajados, {
                horas_diurnas: horasDiurnas,
                horas_dominicales_diurnas: horasDom,
                horas_festivas_diurnas: horasFest,
                horas_extra_diurna_dominical: horasExtraDom,
                comisiones: comisiones,
                otras_deducciones: otrasDeducciones,
                periodo_mes: mesPeriodo,
                periodo_anio: anioPeriodo,
                usuario_nombre: usuario?.nombre_completo || 'Sistema'
            });
            setNominaCalculada(calculo);
            setSaldoPendiente(null);
            setPagosRegistrados([]);
        } catch (error) {
            console.error('Error calculando nómina:', error);
            alert('Error al calcular nómina');
        } finally {
            setLoading(false);
        }
    };

    const handleGuardarNomina = async () => {
        if (!selectedEmpleadoId || !nominaCalculada) {
            alert('Primero calcule la nómina del empleado');
            return;
        }
        setLoading(true);
        try {
            const resultado = await apiService.guardarNominaDetalle({
                empleado_id: selectedEmpleadoId,
                dias_trabajados: diasTrabajados,
                horas_diurnas: horasDiurnas,
                horas_dominicales_diurnas: horasDom,
                horas_festivas_diurnas: horasFest,
                horas_extra_diurna_dominical: horasExtraDom,
                comisiones,
                otras_deducciones: otrasDeducciones,
                periodo_mes: mesPeriodo,
                periodo_anio: anioPeriodo,
                usuario_nombre: usuario?.nombre_completo || 'Sistema'
            });
            setNominaCalculada(resultado.detalle);
            setPagosRegistrados(resultado.pagos || []);
            setSaldoPendiente(resultado.saldo_pendiente);
            
            if (resultado.info) {
                alert(resultado.info);
            } else {
                alert('Nómina guardada y PDF versionado correctamente');
            }
        } catch (error) {
            console.error('Error guardando nómina:', error);
            alert('Error al guardar nómina');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPreview = async () => {
        if (!nominaCalculada) return;
        try {
            const blob = await apiService.generarPDFPreview(nominaCalculada);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const mes = (nominaCalculada.periodo_mes || '').toUpperCase();
            a.download = `nomina_${nominaCalculada.empleado_id}_${nominaCalculada.periodo_anio}_${mes}_v${nominaCalculada.version || 1}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error descargando PDF:', error);
            alert('Error al generar PDF');
        }
    };

    const handleCargarHistorial = async () => {
        if (!selectedEmpleadoId) {
            alert('Seleccione un empleado para ver el historial');
            return;
        }
        setHistoryLoading(true);
        try {
            const data = await apiService.getHistorialNomina(selectedEmpleadoId, {
                periodo_mes: mesPeriodo,
                periodo_anio: anioPeriodo
            });
            setHistNominas(data.nominas || []);
            
            // Extraer pagos de todas las nóminas (vienen en pagos_registrados de cada una)
            const todosPagos: PagoNomina[] = [];
            for (const nom of (data.nominas || [])) {
                if (nom.pagos_registrados) {
                    for (const pago of nom.pagos_registrados) {
                        todosPagos.push({
                            ...pago,
                            nomina_detalle_id: nom.id || '' // Mapear nomina_id a nomina_detalle_id para compatibilidad
                        });
                    }
                }
            }
            setHistPagos(todosPagos);
            
            setHistCambios(data.historial || []);
            if (data.nominas && data.nominas.length > 0) {
                setSelectedHistNominaId(data.nominas[0].id || null);
            } else {
                setSelectedHistNominaId(null);
            }
        } catch (error) {
            console.error('Error cargando historial de nómina:', error);
            alert('Error al cargar historial de nómina');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleRegistrarPago = async () => {
        console.log('🔔 handleRegistrarPago llamado');
        console.log('   selectedHistNominaId:', selectedHistNominaId);
        console.log('   nuevoPagoValor:', nuevoPagoValor);
        console.log('   nuevoPagoFecha:', nuevoPagoFecha);
        
        if (!selectedHistNominaId) {
            alert('Seleccione una nómina para registrar el pago');
            return;
        }

        const selectedNomina = histNominas.find(n => n.id === selectedHistNominaId);
        console.log('   selectedNomina:', selectedNomina);
        
        if (selectedNomina && selectedNomina.estado !== 'ABIERTA') {
            alert('No se pueden registrar pagos en versiones históricas. Seleccione la versión activa (ABIERTA).');
            return;
        }

        if (!nuevoPagoValor || nuevoPagoValor <= 0) {
            alert('Ingrese un valor de pago válido');
            return;
        }
        
        // Validar que el pago no supere el saldo pendiente
        if (selectedNomina) {
            const pagosDeEstaNomina = histPagos.filter(p => p.nomina_detalle_id === selectedHistNominaId);
            const totalPagado = pagosDeEstaNomina.reduce((acc, p) => acc + Number(p.valor || 0), 0);
            const netoPagar = Number(selectedNomina.neto_pagado) || 0;
            const saldoPendiente = netoPagar - totalPagado;
            
            if (nuevoPagoValor > saldoPendiente) {
                alert(`El valor del pago ($${nuevoPagoValor.toLocaleString()}) supera el saldo pendiente ($${Math.round(saldoPendiente).toLocaleString()})`);
                return;
            }
        }
        
        setHistoryLoading(true);
        try {
            console.log('   📤 Enviando pago al servidor...');
            await apiService.registrarPagoNomina(selectedHistNominaId, {
                valor: nuevoPagoValor,
                fecha: nuevoPagoFecha || undefined,
                tipo: 'QUINCENA'
            });
            console.log('   ✅ Pago registrado correctamente');
            await handleCargarHistorial();
            setNuevoPagoValor(0);
            setNuevoPagoFecha('');
        } catch (error: any) {
            console.error('❌ Error registrando pago de nómina:', error);
            alert(error.response?.data?.error || 'Error al registrar pago');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDescargarPDFNomina = async (nominaDetalleId: string) => {
        try {
            const blob = await apiService.descargarPDFNomina(nominaDetalleId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nomina_${nominaDetalleId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error descargando PDF de nómina:', error);
            alert('Error al descargar PDF de nómina');
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setLoading(true);
        try {
            await apiService.updateConfiguracionNomina(config);
            alert('Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            alert('Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Gestión de Nómina</h2>

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    className={`py-2 px-4 ${activeTab === 'run' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('run')}
                >
                    <div className="flex items-center gap-2"><Calculator size={18} /> Calcular Nómina</div>
                </button>
                <button
                    className={`py-2 px-4 ${activeTab === 'config' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('config')}
                >
                    <div className="flex items-center gap-2"><Settings size={18} /> Configuración</div>
                </button>
                <button
                    className={`py-2 px-4 ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('history')}
                >
                    <div className="flex items-center gap-2"><FileText size={18} /> Historial</div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white p-6 rounded-lg shadow">
                
                {/* CALCULAR NÓMINA */}
                {activeTab === 'run' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                                <select 
                                    className="w-full border rounded-md p-2"
                                    value={selectedEmpleadoId}
                                    onChange={(e) => {
                                        setSelectedEmpleadoId(e.target.value);
                                        setNominaCalculada(null); // Reset preview
                                    }}
                                >
                                    <option value="">Seleccione...</option>
                                    {empleados.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Días Trabajados</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={diasTrabajados}
                                    onChange={(e) => setDiasTrabajados(parseInt(e.target.value))}
                                    min={1} max={30}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Horas Diurnas</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={horasDiurnas}
                                    onChange={(e) => setHorasDiurnas(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Horas Dom.</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={horasDom}
                                    onChange={(e) => setHorasDom(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Horas Fest.</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={horasFest}
                                    onChange={(e) => setHorasFest(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">H. Extra Dom.</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={horasExtraDom}
                                    onChange={(e) => setHorasExtraDom(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comisiones</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={comisiones}
                                    onChange={(e) => setComisiones(parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mes Periodo</label>
                                <select 
                                    className="w-full border rounded-md p-2 bg-blue-50/50"
                                    value={mesPeriodo}
                                    onChange={(e) => setMesPeriodo(e.target.value)}
                                >
                                    {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Año Periodo</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2 bg-blue-50/50"
                                    value={anioPeriodo}
                                    onChange={(e) => setAnioPeriodo(parseInt(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-red-600 mb-1">Descuentos (Adelantos)</label>
                                <input 
                                    type="number" 
                                    className="w-full border-2 border-red-200 rounded-md p-2 bg-red-50"
                                    value={otrasDeducciones}
                                    onChange={(e) => setOtrasDeducciones(parseFloat(e.target.value))}
                                    placeholder="Préstamos/Adelantos"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <button 
                                    onClick={handleCalcular}
                                    disabled={loading || !selectedEmpleadoId}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {loading ? 'Calculando...' : 'Calcular'}
                                </button>
                            </div>
                        </div>

                        {nominaCalculada && (
                            <div className="mt-8 border rounded-lg overflow-hidden">
                                <div className="bg-blue-900 text-white px-4 py-3 border-b flex justify-between items-center">
                                    <h3 className="font-bold text-lg">Vista Previa Nómina</h3>
                                    <div className="flex gap-4 items-center">
                                        <div className="text-[10px] text-blue-200 border-r border-blue-700 pr-4 hidden md:block">
                                            <div className="flex items-center gap-1"><Calendar size={10} /> {nominaCalculada.periodo_mes} {nominaCalculada.periodo_anio}</div>
                                            <div className="flex items-center gap-1"><User size={10} /> {nominaCalculada.usuario_nombre}</div>
                                        </div>
                                        <button 
                                            onClick={handleGuardarNomina}
                                            disabled={loading || !selectedEmpleadoId}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm font-medium transition-colors"
                                        >
                                            <Save size={16} /> Guardar Nómina
                                        </button>
                                        <button 
                                            onClick={handleDownloadPreview}
                                            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded flex items-center gap-1 text-sm font-medium transition-colors border border-white/20"
                                        >
                                            <Download size={16} /> Descargar PDF
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="font-semibold text-green-700 border-b pb-2 mb-3">Devengados</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Sueldo Básico</span>
                                                <span>${Math.round(nominaCalculada.sueldo_basico).toLocaleString()}</span>
                                            </div>
                                            {nominaCalculada.valor_diurnas && nominaCalculada.valor_diurnas > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Recargo Diurno ({Math.round(nominaCalculada.horas_diurnas || 0)}h)</span>
                                                    <span>${Math.round(nominaCalculada.valor_diurnas).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {nominaCalculada.auxilio_transporte > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Aux. Transporte</span>
                                                    <span>${Math.round(nominaCalculada.auxilio_transporte).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {nominaCalculada.valor_dominicales_diurnas && nominaCalculada.valor_dominicales_diurnas > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Recargo Dominical ({nominaCalculada.horas_dominicales_diurnas}h)</span>
                                                    <span>${Math.round(nominaCalculada.valor_dominicales_diurnas).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {nominaCalculada.valor_festivas_diurnas && nominaCalculada.valor_festivas_diurnas > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Recargo Festivo ({nominaCalculada.horas_festivas_diurnas}h)</span>
                                                    <span>${Math.round(nominaCalculada.valor_festivas_diurnas).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {nominaCalculada.valor_extra_diurna_dominical && nominaCalculada.valor_extra_diurna_dominical > 0 && (
                                                <div className="flex justify-between">
                                                    <span>H. Extra Dominical ({nominaCalculada.horas_extra_diurna_dominical}h)</span>
                                                    <span>${Math.round(nominaCalculada.valor_extra_diurna_dominical || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {(nominaCalculada.comisiones || 0) > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Comisiones</span>
                                                    <span>${Math.round(nominaCalculada.comisiones || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {(nominaCalculada.otros_devengados || 0) > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Otros Devengados</span>
                                                    <span>${Math.round(nominaCalculada.otros_devengados || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                                <span>Total Devengado</span>
                                                <span>${Math.round(nominaCalculada.total_devengado).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-red-700 border-b pb-2 mb-3">Deducciones</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Salud (4%)</span>
                                                <span>${Math.round(nominaCalculada.salud_empleado || nominaCalculada.salud || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Pensión (4%)</span>
                                                <span>${Math.round(nominaCalculada.pension_empleado || nominaCalculada.pension || 0).toLocaleString()}</span>
                                            </div>
                                            {nominaCalculada.otras_deducciones > 0 && (
                                                <div className="flex justify-between text-red-700 bg-red-50 p-1 rounded">
                                                    <span className="font-medium">Adelantos / Descuentos</span>
                                                    <span>${Math.round(nominaCalculada.otras_deducciones).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                                <span>Total Deducciones</span>
                                                <span>${Math.round(nominaCalculada.total_deducciones).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg mt-2 flex justify-between items-center">
                                        <span className="text-xl font-bold text-blue-900">Neto a Pagar</span>
                                        <span className="text-2xl font-bold text-blue-900">${Math.round(nominaCalculada.neto_pagado).toLocaleString()}</span>
                                    </div>

                                    {/* SECCIÓN DE SALDO PENDIENTE Y PAGOS */}
                                    {(saldoPendiente !== null) && (
                                        <div className="md:col-span-2 mt-4 border-t pt-4">
                                            <h4 className="font-bold text-gray-700 mb-2">Estado de Cuenta</h4>
                                            
                                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-600">Total Nómina (Versión Activa):</span>
                                                    <span className="font-medium">${Math.round(nominaCalculada.neto_pagado).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-green-700">
                                                    <span className="flex items-center gap-1"><CheckCircle size={14}/> Pagos Realizados:</span>
                                                    <span className="font-medium">-${Math.round((nominaCalculada.neto_pagado || 0) - (saldoPendiente || 0)).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                                                    <span className="font-bold text-gray-800">Saldo Pendiente:</span>
                                                    <span className={`font-bold text-lg ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        ${Math.round(saldoPendiente).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {pagosRegistrados.length > 0 && (
                                                <div className="mt-4">
                                                    <h5 className="text-sm font-semibold text-gray-600 mb-2">Detalle de Pagos</h5>
                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-gray-100">
                                                                <th className="p-2 text-left">Fecha</th>
                                                                <th className="p-2 text-left">Tipo</th>
                                                                <th className="p-2 text-right">Valor</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pagosRegistrados.map((p, idx) => (
                                                                <tr key={idx} className="border-b">
                                                                    <td className="p-2">{new Date(p.fecha).toLocaleDateString()}</td>
                                                                    <td className="p-2">{p.tipo}</td>
                                                                    <td className="p-2 text-right">${Math.round(p.valor).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CONFIGURACIÓN */}
                {activeTab === 'config' && config && (
                    <form onSubmit={handleSaveConfig} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* General */}
                            <div className="md:col-span-3 bg-gray-50 p-3 rounded-md">
                                <h4 className="font-bold text-gray-700 mb-3">Parámetros Generales {config.anio}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Salario Mínimo</label>
                                        <input type="number" className="w-full border p-1 rounded" 
                                            value={config.salario_minimo} onChange={e => setConfig({...config, salario_minimo: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Aux. Transporte</label>
                                        <input type="number" className="w-full border p-1 rounded" 
                                            value={config.auxilio_transporte} onChange={e => setConfig({...config, auxilio_transporte: parseFloat(e.target.value)})}/>
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">UVT</label>
                                        <input type="number" className="w-full border p-1 rounded" 
                                            value={config.uvt} onChange={e => setConfig({...config, uvt: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Horas Mes (Cálculo hora)</label>
                                        <input type="number" className="w-full border p-1 rounded" 
                                            value={config.horas_mensuales} onChange={e => setConfig({...config, horas_mensuales: parseInt(e.target.value)})}/>
                                    </div>
                                </div>
                            </div>

                            {/* Recargos y Extras Config */}
                            <div className="md:col-span-3 bg-purple-50 p-3 rounded-md">
                                <h4 className="font-bold text-purple-800 mb-3 text-sm">Recargos y Extras (%)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Rec. Dominical (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_recargo_dominical} onChange={e => setConfig({...config, porc_recargo_dominical: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Rec. Festivo (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_recargo_festivo} onChange={e => setConfig({...config, porc_recargo_festivo: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Rec. Diurno (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_recargo_diurno} onChange={e => setConfig({...config, porc_recargo_diurno: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Extra Dom. (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_extra_diurna_dominical} onChange={e => setConfig({...config, porc_extra_diurna_dominical: parseFloat(e.target.value)})}/>
                                    </div>
                                </div>
                            </div>

                            {/* Porcentajes Empleado */}
                             <div className="bg-blue-50 p-3 rounded-md">
                                <h4 className="font-bold text-blue-800 mb-3 text-sm">Aportes Empleado</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Salud (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_salud_empleado} onChange={e => setConfig({...config, porc_salud_empleado: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Pensión (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_pension_empleado} onChange={e => setConfig({...config, porc_pension_empleado: parseFloat(e.target.value)})}/>
                                    </div>
                                </div>
                            </div>

                            {/* Porcentajes Empresa */}
                            <div className="bg-green-50 p-3 rounded-md">
                                <h4 className="font-bold text-green-800 mb-3 text-sm">Aportes Empresa</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Salud (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_salud_empleador} onChange={e => setConfig({...config, porc_salud_empleador: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Pensión (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_pension_empleador} onChange={e => setConfig({...config, porc_pension_empleador: parseFloat(e.target.value)})}/>
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500">Caja Comp (%)</label>
                                        <input type="number" step="0.1" className="w-full border p-1 rounded" 
                                            value={config.porc_caja_comp} onChange={e => setConfig({...config, porc_caja_comp: parseFloat(e.target.value)})}/>
                                    </div>
                                </div>
                            </div>

                            {/* Prestaciones */}
                             <div className="bg-yellow-50 p-3 rounded-md">
                                <h4 className="font-bold text-yellow-800 mb-3 text-sm">Prestaciones Sociales</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Cesantías (%)</label>
                                        <input type="number" step="0.01" className="w-full border p-1 rounded" 
                                            value={config.porc_cesantias} onChange={e => setConfig({...config, porc_cesantias: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Prima (%)</label>
                                        <input type="number" step="0.01" className="w-full border p-1 rounded" 
                                            value={config.porc_prima} onChange={e => setConfig({...config, porc_prima: parseFloat(e.target.value)})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Vacaciones (%)</label>
                                        <input type="number" step="0.01" className="w-full border p-1 rounded" 
                                            value={config.porc_vacaciones} onChange={e => setConfig({...config, porc_vacaciones: parseFloat(e.target.value)})}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <Save size={18} /> Guardar Configuración
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                                <select 
                                    className="w-full border rounded-md p-2"
                                    value={selectedEmpleadoId}
                                    onChange={(e) => {
                                        setSelectedEmpleadoId(e.target.value);
                                        setHistNominas([]);
                                        setHistPagos([]);
                                        setHistCambios([]);
                                        setSelectedHistNominaId(null);
                                    }}
                                >
                                    <option value="">Seleccione...</option>
                                    {empleados.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                                <select 
                                    className="w-full border rounded-md p-2"
                                    value={mesPeriodo}
                                    onChange={(e) => setMesPeriodo(e.target.value)}
                                >
                                    {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded-md p-2"
                                    value={anioPeriodo}
                                    onChange={(e) => setAnioPeriodo(parseInt(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleCargarHistorial}
                                    disabled={historyLoading || !selectedEmpleadoId}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 justify-center"
                                >
                                    {historyLoading ? 'Cargando...' : 'Ver Historial'}
                                </button>
                            </div>
                        </div>

                        {histNominas.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <FileText size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No hay historial para los filtros seleccionados.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto border rounded-md">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Versión</th>
                                                <th className="px-3 py-2 text-left">Estado</th>
                                                <th className="px-3 py-2 text-right">Devengado</th>
                                                <th className="px-3 py-2 text-right">Deducciones</th>
                                                <th className="px-3 py-2 text-right">Neto</th>
                                                <th className="px-3 py-2 text-right">PDF</th>
                                                <th className="px-3 py-2 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {histNominas.map((n) => {
                                                // El saldo se calcula sobre la versión activa del periodo menos TODOS los pagos del periodo
                                                const totalPagadoPeriodo = histPagos.reduce((acc, p) => acc + p.valor, 0);
                                                const isVersionActiva = n.estado === 'ABIERTA';
                                                const saldo = isVersionActiva ? Math.round((n.neto_pagado || 0) - totalPagadoPeriodo) : 0;
                                                const isSelected = selectedHistNominaId === n.id;
                                                return (
                                                    <tr 
                                                        key={n.id} 
                                                        className={`border-t ${isSelected ? 'bg-blue-50' : ''}`}
                                                    >
                                                        <td className="px-3 py-2 text-xs">{n.version || 1}</td>
                                                        <td className="px-3 py-2 text-xs">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                                n.estado === 'ABIERTA' ? 'bg-green-100 text-green-700' : 
                                                                n.estado === 'AJUSTADA' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {n.estado || 'ABIERTA'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">${Math.round(n.total_devengado).toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right">${Math.round(n.total_deducciones).toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right">${Math.round(n.neto_pagado).toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                onClick={() => n.id && handleDescargarPDFNomina(n.id)}
                                                                disabled={!n.pdf_path}
                                                                className="text-xs text-blue-600 hover:underline disabled:text-gray-400"
                                                            >
                                                                Ver PDF v{n.pdf_version || n.version || 1}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                onClick={() => setSelectedHistNominaId(n.id || null)}
                                                                className="text-xs px-2 py-1 rounded border text-blue-700 border-blue-200 hover:bg-blue-50"
                                                            >
                                                                {n.estado === 'ABIERTA' ? 'Registrar Pago / Detalle' : 'Ver Detalle Histórico'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedHistNominaId && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div className="bg-white border rounded-md p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-sm">Pagos del Periodo</h4>
                                                {(() => {
                                                    const selectedNomina = histNominas.find(n => n.id === selectedHistNominaId);
                                                    if (selectedNomina && selectedNomina.estado === 'ABIERTA') {
                                                        // Filtrar solo los pagos de esta nómina específica
                                                        const pagosDeEstaNomina = histPagos.filter(p => p.nomina_detalle_id === selectedHistNominaId);
                                                        const totalPagado = pagosDeEstaNomina.reduce((acc, p) => acc + Number(p.valor || 0), 0);
                                                        const netoPagar = Number(selectedNomina.neto_pagado) || 0;
                                                        const saldo = Math.round(netoPagar - totalPagado);
                                                        return (
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-gray-500 uppercase font-bold">Saldo Pendiente</div>
                                                                <div className={`text-sm font-bold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    ${saldo.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            <div className="space-y-3">
                                                {/* Solo mostrar formulario de pago para la versión ABIERTA */}
                                                {histNominas.find(n => n.id === selectedHistNominaId)?.estado === 'ABIERTA' ? (
                                                    <div className="grid grid-cols-4 gap-2 items-end mb-4 bg-gray-50 p-3 rounded-md border border-dashed border-gray-300">
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Valor pago (quincena)</label>
                                                            <input 
                                                                type="number"
                                                                className="w-full border rounded-md p-1 text-sm"
                                                                value={nuevoPagoValor}
                                                                onChange={(e) => setNuevoPagoValor(parseFloat(e.target.value))}
                                                                placeholder="$0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                                                            <input 
                                                                type="date"
                                                                className="w-full border rounded-md p-1 text-sm"
                                                                value={nuevoPagoFecha}
                                                                onChange={(e) => setNuevoPagoFecha(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={handleRegistrarPago}
                                                                disabled={historyLoading}
                                                                className="w-full bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-emerald-700 disabled:bg-gray-400 shadow-sm"
                                                            >
                                                                REGISTRAR
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[10px] text-amber-800 mb-4 flex items-center gap-2">
                                                        <Info size={14} />
                                                        Esta es una versión histórica. No se permiten nuevos pagos aquí.
                                                    </div>
                                                )}

                                                {histPagos.filter(p => p.nomina_detalle_id === selectedHistNominaId).length === 0 ? (
                                                    <p className="text-xs text-gray-500">No hay pagos registrados para esta nómina.</p>
                                                ) : (
                                                    <div className="max-h-40 overflow-y-auto border rounded">
                                                        <table className="min-w-full text-xs">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-2 py-1 text-left">Fecha</th>
                                                                    <th className="px-2 py-1 text-left">Tipo</th>
                                                                    <th className="px-2 py-1 text-right">Valor</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {histPagos.filter(p => p.nomina_detalle_id === selectedHistNominaId).map(p => (
                                                                    <tr key={p.id} className="border-t">
                                                                        <td className="px-2 py-1">{new Date(p.fecha).toLocaleDateString()}</td>
                                                                        <td className="px-2 py-1">{p.tipo}</td>
                                                                        <td className="px-2 py-1 text-right">${Math.round(p.valor).toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white border rounded-md p-4">
                                            <h4 className="font-semibold text-sm mb-3">Historial de cambios</h4>
                                            {histCambios.filter(h => h.nomina_detalle_id === selectedHistNominaId).length === 0 ? (
                                                <p className="text-xs text-gray-500">No hay cambios registrados para esta nómina.</p>
                                            ) : (
                                                <div className="max-h-40 overflow-y-auto border rounded">
                                                    <table className="min-w-full text-xs">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-2 py-1 text-left">Versión</th>
                                                                <th className="px-2 py-1 text-left">Fecha</th>
                                                                <th className="px-2 py-1 text-left">Cambio</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {histCambios.filter(h => h.nomina_detalle_id === selectedHistNominaId).map(h => (
                                                                <tr key={h.id} className="border-t">
                                                                    <td className="px-2 py-1">{h.version || '-'}</td>
                                                                    <td className="px-2 py-1">{h.fecha ? new Date(h.fecha).toLocaleString() : (h.fecha_generacion ? new Date(h.fecha_generacion).toLocaleString() : '-')}</td>
                                                                    <td className="px-2 py-1">{(h as any).cambio || h.cambio_realizado || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* PANELES INFORMATIVOS (EDUCATIVOS) */}
                {activeTab === 'run' && (
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-8">
                        {/* Cuadro 1: Jornada */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-blue-600">
                                <Clock size={24} />
                                <h3 className="font-bold text-gray-800">📝 CUADRO 1: Evolución de la Jornada</h3>
                            </div>
                            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                                En Colombia, la jornada laboral disminuye y el valor de la hora aumenta automáticamente por ley.
                            </p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 uppercase">
                                            <th className="p-2 border">Periodo</th>
                                            <th className="p-2 border">Jornada</th>
                                            <th className="p-2 border">Divisor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="p-2">Actual - Jul 14, 2026</td>
                                            <td className="p-2 font-medium">44 horas</td>
                                            <td className="p-2">220 horas</td>
                                        </tr>
                                        <tr className="bg-blue-50/30">
                                            <td className="p-2">Jul 15, 2026 - 2027</td>
                                            <td className="p-2 font-black text-blue-700">42 horas</td>
                                            <td className="p-2 font-black text-blue-700">210 horas</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex gap-2 bg-blue-50 p-2 rounded border border-blue-100 italic text-[10px] text-blue-800">
                                <Lightbulb size={16} className="shrink-0" />
                                <p>Al reducirse el divisor de 220 a 210, el valor de cada hora sube aprox. un 4.7%.</p>
                            </div>
                        </div>

                        {/* Cuadro 2: Recargos */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-emerald-600">
                                <TrendingUp size={24} />
                                <h3 className="font-bold text-gray-800">📅 CUADRO 2: Incremento de Recargos</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Hasta Junio 2025', value: '75%', color: 'gray' },
                                    { label: 'Julio 2025 - Junio 2026', value: '80%', color: 'blue', current: true },
                                    { label: 'Julio 2026 - Junio 2027', value: '90%', color: 'amber' },
                                    { label: 'A partir de Julio 2027', value: '100%', color: 'red' },
                                ].map((item, i) => (
                                    <div key={i} className={`flex justify-between items-center p-2 rounded ${item.current ? 'bg-emerald-50 border border-emerald-100 font-bold' : 'text-gray-600'}`}>
                                        <span className="text-xs">{item.label}</span>
                                        <span className={`text-sm ${item.current ? 'text-emerald-700' : ''}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cuadro 3: Fórmulas */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <BookOpen size={24} />
                                <h3 className="font-bold text-gray-800">🧮 CUADRO 3: Fórmulas Maestras</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-2 bg-gray-50 rounded">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Valor Hora (VHO)</p>
                                    <p className="text-[11px] text-gray-700 font-mono">Salario / Divisor (220/210)</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Dom/Fest Total</p>
                                    <p className="text-[11px] text-gray-700 font-mono">VHO * 1.80 (o 1.90)</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Seguridad Social</p>
                                    <p className="text-[11px] text-gray-700 font-mono">IBC * 4% (Fórmula Ley)</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Neto a Pagar</p>
                                    <p className="text-[11px] text-gray-700 font-mono">Devengado - Deducción + Aux</p>
                                </div>
                            </div>
                        </div>

                        {/* Cuadro 4: Reglas de Oro */}
                        <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <AlertTriangle size={24} />
                                <h3 className="font-bold text-gray-800">⚠️ CUADRO 4: Reglas de Oro</h3>
                            </div>
                            <ul className="text-xs text-gray-600 space-y-3">
                                <li className="flex gap-2">
                                    <div className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                    <span><strong>Sábados:</strong> Día ordinario a menos que supere la jornada contractual semanal.</span>
                                </li>
                                <li className="flex gap-2">
                                    <div className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                    <span><strong>Promedios:</strong> Las prestaciones se liquidan sumando todos los recargos del periodo.</span>
                                </li>
                                {/* <li className="flex gap-1.5 items-center p-2 bg-yellow-50 rounded text-amber-800 font-medium">
                                    <Info size={14} />
                                    <span>Alerta: &gt; 2 domingos requiere compensatorio.</span>
                                </li> */}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestionNomina;
