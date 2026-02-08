'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Building2, Users, FileCheck, 
  Calendar, Mail, Phone, MapPin, Clock,
  Shield, AlertTriangle, RefreshCw, Key, 
  Lock, Unlock, LogOut, TrendingUp, 
  CreditCard, History, CheckCircle, XCircle,
  Pause, Play, AlertCircle, DollarSign, Trash2,
  Check, Eye
} from 'lucide-react';
import { ImpersonarModal } from '../../../../components/Impersonation';

// Tipos
interface LicenciaDetalle {
  id: string;
  plan: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias_restantes: number | null;
  max_usuarios: number;
  max_mesas: number;
  features: Record<string, boolean>;
  notas: string | null;
}

interface AdminPrincipal {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  ultimo_login: string | null;
  bloqueado: boolean;
}

interface MetricasEmpresa {
  total_usuarios: number;
  usuarios_activos: number;
  ultimo_login_empresa: string | null;
  total_comandas: number;
  comandas_ultimo_mes: number;
  total_facturas: number;
  ultima_comanda: string | null;
  ultima_factura: string | null;
}

interface AlertaSaaS {
  tipo: string;
  mensaje: string;
  severidad: 'info' | 'warning' | 'danger';
}

interface SaludEmpresa {
  ultimo_acceso: string | null;
  dias_sin_acceso: number | null;
  estado_inventario: string;
  alertas_activas: AlertaSaaS[];
  errores_recientes: number;
}

interface UsuarioResumen {
  id: string;
  nombre: string;
  email: string;
  rol_nombre: string | null;
  activo: boolean;
  ultimo_login: string | null;
}

interface EmpresaDetalle {
  id: string;
  nombre: string;
  slug: string;
  email_contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  plan_actual: string;
  estado: string;
  created_at: string;
  licencia: LicenciaDetalle | null;
  admin_principal: AdminPrincipal | null;
  metricas: MetricasEmpresa;
  salud: SaludEmpresa;
  usuarios_resumen: UsuarioResumen[];
}

interface AuditoriaRegistro {
  id: string;
  accion: string;
  detalles: Record<string, any>;
  admin_email: string;
  created_at: string;
}

// Tabs disponibles
type TabType = 'general' | 'licencia' | 'usuarios' | 'auditoria';

// Tipo para notificaciones
interface Notificacion {
  id: string;
  tipo: 'success' | 'error' | 'info' | 'warning';
  mensaje: string;
  detalles?: string;
}

export default function EmpresaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const empresaId = params.id as string;

  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaRegistro[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sistema de notificaciones
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);

  // Modales
  const [showExtenderModal, setShowExtenderModal] = useState(false);
  const [showPausarModal, setShowPausarModal] = useState(false);
  const [showCambiarPlanModal, setShowCambiarPlanModal] = useState(false);
  const [showCambiarEmailModal, setShowCambiarEmailModal] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [showCrearLicenciaModal, setShowCrearLicenciaModal] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);

  // Estado de impersonación
  const [showImpersonarModal, setShowImpersonarModal] = useState(false);
  const [usuarioAImpersonar, setUsuarioAImpersonar] = useState<UsuarioResumen | null>(null);

  // Función para agregar notificaciones
  const agregarNotificacion = (tipo: 'success' | 'error' | 'info' | 'warning', mensaje: string, detalles?: string) => {
    const id = Date.now().toString();
    setNotificaciones(prev => [...prev, { id, tipo, mensaje, detalles }]);
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchEmpresa = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}`, {
        headers: getAuthHeaders()
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Error al cargar empresa');
      }

      const data = await res.json();
      setEmpresa(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [empresaId, getAuthHeaders, router]);

  const fetchAuditoria = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/auditoria?limite=20`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAuditoria(data);
      }
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    }
  }, [empresaId, getAuthHeaders]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchEmpresa();
    fetchAuditoria();
  }, [router, fetchEmpresa, fetchAuditoria]);

  // Acciones sobre el admin
  const handleResetPassword = async () => {
    setShowConfirmResetPassword(false);
    setActionLoading('reset-password');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordTemporal(data.passwordTemporal);
        agregarNotificacion('success', 'Contraseña reseteada exitosamente');
        fetchEmpresa();
        fetchAuditoria();
      } else {
        agregarNotificacion('error', data.error || 'Error al resetear contraseña');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBloqueo = async () => {
    const bloquear = !empresa?.admin_principal?.bloqueado;
    if (!confirm(`¿${bloquear ? 'Bloquear' : 'Desbloquear'} al admin?`)) return;
    
    setActionLoading('toggle-bloqueo');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/toggle-bloqueo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bloquear })
      });
      if (res.ok) {
        agregarNotificacion('success', `Admin ${bloquear ? 'bloqueado' : 'desbloqueado'} exitosamente`);
        fetchEmpresa();
        fetchAuditoria();
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al cambiar estado de bloqueo');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCerrarSesiones = async () => {
    if (!confirm('¿Cerrar todas las sesiones de esta empresa?')) return;
    
    setActionLoading('cerrar-sesiones');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/cerrar-sesiones`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        agregarNotificacion('success', `${data.sesiones_cerradas} sesión(es) cerrada(s) exitosamente`);
        fetchAuditoria();
      } else {
        agregarNotificacion('error', data.error || 'Error al cerrar sesiones');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Acciones sobre licencia
  const handlePausarLicencia = async (motivo: string) => {
    setActionLoading('pausar');
    try {
      const res = await fetch(`/api/admin/licencias/${empresa?.licencia?.id}/pausar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ motivo })
      });
      if (res.ok) {
        agregarNotificacion('success', 'Licencia pausada exitosamente');
        fetchEmpresa();
        fetchAuditoria();
        setShowPausarModal(false);
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al pausar licencia');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReanudarLicencia = async () => {
    if (!confirm('¿Reanudar la licencia? Se extenderá automáticamente por los días pausados.')) return;
    
    setActionLoading('reanudar');
    try {
      const res = await fetch(`/api/admin/licencias/${empresa?.licencia?.id}/reanudar`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        agregarNotificacion('success', 'Licencia reanudada exitosamente');
        fetchEmpresa();
        fetchAuditoria();
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al reanudar licencia');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtenderLicencia = async (dias: number, motivo: string) => {
    setActionLoading('extender');
    try {
      const res = await fetch(`/api/admin/licencias/${empresa?.licencia?.id}/extender`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dias, motivo })
      });
      if (res.ok) {
        agregarNotificacion('success', `Licencia extendida por ${dias} días`);
        fetchEmpresa();
        fetchAuditoria();
        setShowExtenderModal(false);
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al extender licencia');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCambiarPlan = async (nuevoPlan: string, motivo: string) => {
    setActionLoading('cambiar-plan');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/cambiar-plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nuevoPlan, motivo })
      });
      if (res.ok) {
        agregarNotificacion('success', `Plan cambiado a ${nuevoPlan} exitosamente`);
        fetchEmpresa();
        fetchAuditoria();
        setShowCambiarPlanModal(false);
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al cambiar plan');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCambiarEmail = async (nuevoEmail: string) => {
    setActionLoading('cambiar-email');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/cambiar-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nuevoEmail })
      });
      if (res.ok) {
        agregarNotificacion('success', 'Email cambiado exitosamente');
        fetchEmpresa();
        fetchAuditoria();
        setShowCambiarEmailModal(false);
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al cambiar email');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handler para crear nueva licencia
  const handleCrearLicencia = async (plan: string, duracionDias: number, esPrueba: boolean, notas: string) => {
    setActionLoading('crear-licencia');
    try {
      const res = await fetch('/api/admin/licencias', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          empresaId,
          plan,
          duracionDias,
          esPrueba,
          notas
        })
      });
      if (res.ok) {
        agregarNotificacion('success', esPrueba ? 'Periodo de prueba iniciado exitosamente' : 'Licencia creada exitosamente');
        fetchEmpresa();
        fetchAuditoria();
        setShowCrearLicenciaModal(false);
      } else {
        const data = await res.json();
        agregarNotificacion('error', data.error || 'Error al crear licencia');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handler para eliminar empresa (soft delete)
  const handleEliminarEmpresa = async (
    motivo: string, 
    motivoDetalle: string, 
    confirmacionTexto: string, 
    passwordAdmin: string
  ) => {
    setActionLoading('eliminar');
    try {
      const res = await fetch(`/api/admin/empresas/${empresaId}/eliminar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          motivo, 
          motivoDetalle, 
          confirmacionTexto, 
          passwordAdmin 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        agregarNotificacion('success', 'Empresa eliminada exitosamente', 
          `Usuarios desactivados: ${data.usuariosDesactivados} | Sesiones cerradas: ${data.sesionesInvalidadas}`);
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        agregarNotificacion('error', data.error || 'Error al eliminar empresa');
      }
    } catch (err: any) {
      agregarNotificacion('error', err.message || 'Error de conexión');
    } finally {
      setActionLoading(null);
      setShowEliminarModal(false);
    }
  };

  // Handler para impersonación (Modo Soporte)
  const handleImpersonar = async () => {
    if (!usuarioAImpersonar || !empresa) return;
    
    setActionLoading('impersonar');
    try {
      const res = await fetch('/api/admin/impersonar', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          empresaId: empresa.id,
          usuarioId: usuarioAImpersonar.id
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Guardar token original del admin para poder restaurarlo después
        const originalToken = localStorage.getItem('admin_token');
        localStorage.setItem('original_admin_token', originalToken || '');
        
        // Guardar datos de impersonación para el banner
        localStorage.setItem('impersonation_data', JSON.stringify({
          usuario: data.usuario,
          empresa: data.empresa,
          expiraEn: data.impersonacion.expira_en,
          originalAdminId: data.impersonacion.originalAdminId
        }));
        
        // Guardar el token de impersonación
        localStorage.setItem('impersonation_token', data.token);
        
        agregarNotificacion('success', 
          `Sesión de soporte iniciada como ${data.usuario.nombre}`,
          'Redirigiendo al sistema del cliente...'
        );
        
        // Obtener la URL del frontend del sistema de comandas
        const frontendUrl = process.env.NEXT_PUBLIC_COMANDAS_URL || 'http://localhost:3000';
        
        // Redirigir al sistema de comandas con el token de impersonación
        setTimeout(() => {
          window.location.href = `${frontendUrl}/impersonation-callback?token=${data.token}`;
        }, 1500);
        
      } else {
        agregarNotificacion('error', data.error || 'Error al iniciar impersonación');
      }
    } catch (err: any) {
      agregarNotificacion('error', err.message || 'Error de conexión');
    } finally {
      setActionLoading(null);
      setShowImpersonarModal(false);
      setUsuarioAImpersonar(null);
    }
  };

  // Función para abrir modal de impersonación
  const openImpersonarModal = (usuario: UsuarioResumen) => {
    setUsuarioAImpersonar(usuario);
    setShowImpersonarModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Cargando empresa...</p>
        </div>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Empresa no encontrada'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sistema de Notificaciones */}
      <NotificacionesContainer notificaciones={notificaciones} onCerrar={(id) => {
        setNotificaciones(prev => prev.filter(n => n.id !== id));
      }} />

      {/* Modal de Contraseña Temporal */}
      {passwordTemporal && (
        <PasswordTemporalModal 
          password={passwordTemporal}
          onClose={() => setPasswordTemporal(null)}
        />
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-sky-500" />
              <div>
                <h1 className="text-lg font-bold text-white">{empresa.nombre}</h1>
                <p className="text-sm text-slate-400">{empresa.slug}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <EstadoBadge estado={empresa.estado} />
              <button
                onClick={fetchEmpresa}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alertas */}
      {empresa.salud.alertas_activas.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="space-y-2">
            {empresa.salud.alertas_activas.map((alerta, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  alerta.severidad === 'danger' 
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                {alerta.mensaje}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 border-b border-slate-700">
          {[
            { id: 'general', label: 'Información General', icon: Building2 },
            { id: 'licencia', label: 'Licencia', icon: CreditCard },
            { id: 'usuarios', label: 'Usuarios', icon: Users },
            { id: 'auditoria', label: 'Auditoría', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'general' && (
          <TabGeneral 
            empresa={empresa}
            onResetPassword={handleResetPassword}
            onToggleBloqueo={handleToggleBloqueo}
            onCerrarSesiones={handleCerrarSesiones}
            onCambiarEmail={() => setShowCambiarEmailModal(true)}
            onEliminarEmpresa={() => setShowEliminarModal(true)}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'licencia' && (
          <TabLicencia 
            empresa={empresa}
            onExtender={() => setShowExtenderModal(true)}
            onPausar={() => setShowPausarModal(true)}
            onReanudar={handleReanudarLicencia}
            onCambiarPlan={() => setShowCambiarPlanModal(true)}
            onCrearLicencia={() => setShowCrearLicenciaModal(true)}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'usuarios' && (
          <TabUsuarios empresa={empresa} onImpersonar={openImpersonarModal} />
        )}

        {activeTab === 'auditoria' && (
          <TabAuditoria auditoria={auditoria} onRefresh={fetchAuditoria} />
        )}
      </main>

      {/* Modales */}
      {showExtenderModal && empresa.licencia && (
        <ExtenderModal
          onClose={() => setShowExtenderModal(false)}
          onConfirm={handleExtenderLicencia}
          loading={actionLoading === 'extender'}
        />
      )}

      {showPausarModal && empresa.licencia && (
        <PausarModal
          onClose={() => setShowPausarModal(false)}
          onConfirm={handlePausarLicencia}
          loading={actionLoading === 'pausar'}
        />
      )}

      {showCambiarPlanModal && empresa.licencia && (
        <CambiarPlanModal
          planActual={empresa.plan_actual}
          licencia={empresa.licencia}
          onClose={() => setShowCambiarPlanModal(false)}
          onConfirm={handleCambiarPlan}
          loading={actionLoading === 'cambiar-plan'}
        />
      )}

      {showCambiarEmailModal && empresa.admin_principal && (
        <CambiarEmailModal
          emailActual={empresa.admin_principal.email}
          onClose={() => setShowCambiarEmailModal(false)}
          onConfirm={handleCambiarEmail}
          loading={actionLoading === 'cambiar-email'}
        />
      )}

      {showEliminarModal && (
        <EliminarEmpresaModal
          empresaNombre={empresa.nombre}
          onClose={() => setShowEliminarModal(false)}
          onConfirm={handleEliminarEmpresa}
          loading={actionLoading === 'eliminar'}
        />
      )}

      {showCrearLicenciaModal && (
        <CrearLicenciaModal
          onClose={() => setShowCrearLicenciaModal(false)}
          onConfirm={handleCrearLicencia}
          loading={actionLoading === 'crear-licencia'}
        />
      )}

      {showConfirmResetPassword && (
        <ConfirmModal
          titulo="Resetear Contraseña"
          mensaje="¿Está seguro de resetear la contraseña del administrador? Se generará una nueva contraseña temporal que deberá comunicar al cliente de forma segura."
          onClose={() => setShowConfirmResetPassword(false)}
          onConfirm={handleResetPassword}
          loading={actionLoading === 'reset-password'}
          textoConfirmar="Resetear Contraseña"
          tipoPeligro={false}
        />
      )}

      {/* Modal de Impersonación */}
      {showImpersonarModal && usuarioAImpersonar && empresa && (
        <ImpersonarModal
          usuario={{
            id: usuarioAImpersonar.id,
            nombre: usuarioAImpersonar.nombre,
            email: usuarioAImpersonar.email,
            rol_nombre: usuarioAImpersonar.rol_nombre
          }}
          empresa={{
            id: empresa.id,
            nombre: empresa.nombre
          }}
          onClose={() => {
            setShowImpersonarModal(false);
            setUsuarioAImpersonar(null);
          }}
          onConfirm={handleImpersonar}
          loading={actionLoading === 'impersonar'}
        />
      )}
    </div>
  );
}

// ============================================
// COMPONENTES DE TABS
// ============================================

function TabGeneral({ 
  empresa, 
  onResetPassword, 
  onToggleBloqueo,
  onCerrarSesiones,
  onCambiarEmail,
  onEliminarEmpresa,
  actionLoading 
}: {
  empresa: EmpresaDetalle;
  onResetPassword: () => void;
  onToggleBloqueo: () => void;
  onCerrarSesiones: () => void;
  onCambiarEmail: () => void;
  onEliminarEmpresa: () => void;
  actionLoading: string | null;
}) {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Datos de la empresa */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Datos de la Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={Building2} label="Nombre" value={empresa.nombre} />
            <InfoItem icon={Mail} label="Email Contacto" value={empresa.email_contacto || '-'} />
            <InfoItem icon={Phone} label="Teléfono" value={empresa.telefono || '-'} />
            <InfoItem icon={MapPin} label="Dirección" value={empresa.direccion || '-'} />
            <InfoItem icon={Calendar} label="Creada" value={formatDate(empresa.created_at)} />
            <InfoItem 
              icon={CreditCard} 
              label="Plan" 
              value={empresa.licencia ? (
                <PlanBadge plan={empresa.licencia.plan} />
              ) : (
                <span className="text-slate-500 italic">Sin Licencia Activa</span>
              )} 
            />
          </div>
        </div>

        {/* Métricas */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Métricas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              icon={Users} 
              label="Usuarios" 
              value={`${empresa.metricas.usuarios_activos}/${empresa.metricas.total_usuarios}`}
              subtext="activos"
              color="sky"
            />
            <MetricCard 
              icon={TrendingUp} 
              label="Comandas (30d)" 
              value={empresa.metricas.comandas_ultimo_mes}
              color="green"
            />
            <MetricCard 
              icon={FileCheck} 
              label="Facturas" 
              value={empresa.metricas.total_facturas}
              color="purple"
            />
            <MetricCard 
              icon={Clock} 
              label="Último login" 
              value={empresa.metricas.ultimo_login_empresa 
                ? formatRelativeTime(empresa.metricas.ultimo_login_empresa)
                : 'Nunca'}
              color="slate"
            />
          </div>
        </div>
      </div>

      {/* Admin Principal */}
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Admin Principal</h3>
          
          {empresa.admin_principal ? (
            <>
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-slate-400">Nombre</p>
                  <p className="text-white font-medium">{empresa.admin_principal.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white font-medium">{empresa.admin_principal.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Estado</p>
                  <div className="flex items-center gap-2">
                    {empresa.admin_principal.activo ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-4 h-4" /> Inactivo
                      </span>
                    )}
                    {empresa.admin_principal.bloqueado && (
                      <span className="flex items-center gap-1 text-orange-400 ml-2">
                        <Lock className="w-4 h-4" /> Bloqueado
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Último login</p>
                  <p className="text-white">
                    {empresa.admin_principal.ultimo_login 
                      ? formatDate(empresa.admin_principal.ultimo_login)
                      : 'Nunca'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Acciones</h4>
                
                <button
                  onClick={() => setShowConfirmReset(true)}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-400 
                           hover:bg-amber-600/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  Resetear Contraseña
                </button>

                <button
                  onClick={onCambiarEmail}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-sky-600/20 text-sky-400 
                           hover:bg-sky-600/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  Cambiar Email
                </button>

                <button
                  onClick={onToggleBloqueo}
                  disabled={actionLoading !== null}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    empresa.admin_principal.bloqueado
                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                  }`}
                >
                  {empresa.admin_principal.bloqueado ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      Desbloquear Admin
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Bloquear Admin
                    </>
                  )}
                </button>

                <button
                  onClick={onCerrarSesiones}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 
                           hover:bg-red-600/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Todas las Sesiones
                </button>
              </div>

              {/* Zona de Peligro */}
              <div className="mt-6 pt-4 border-t border-slate-600">
                <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Zona de Peligro
                </h4>
                <button
                  onClick={onEliminarEmpresa}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-red-700/30 text-red-300 
                           hover:bg-red-700/50 border border-red-600/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Empresa (Avanzado)
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Esta acción desactiva permanentemente la empresa y bloquea todos sus accesos.
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-400">No hay admin principal registrado</p>
          )}
        </div>
      </div>
    </div>

      {/* Modal de confirmación para reset password */}
      {showConfirmReset && (
        <ConfirmModal
          titulo="Resetear Contraseña"
          mensaje="¿Está seguro de resetear la contraseña del administrador? Se generará una nueva contraseña temporal que deberá comunicar al cliente de forma segura."
          onClose={() => setShowConfirmReset(false)}
          onConfirm={() => {
            setShowConfirmReset(false);
            onResetPassword();
          }}
          loading={actionLoading === 'reset-password'}
          textoConfirmar="Resetear Contraseña"
          tipoPeligro={false}
        />
      )}
    </>
  );
}

function TabLicencia({ 
  empresa,
  onExtender,
  onPausar,
  onReanudar,
  onCambiarPlan,
  onCrearLicencia,
  actionLoading
}: {
  empresa: EmpresaDetalle;
  onExtender: () => void;
  onPausar: () => void;
  onReanudar: () => void;
  onCambiarPlan: () => void;
  onCrearLicencia: () => void;
  actionLoading: string | null;
}) {
  const licencia = empresa.licencia;

  if (!licencia) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Sin Licencia Activa</h3>
        <p className="text-slate-400 mb-4">Esta empresa no tiene una licencia activa.</p>
        <button 
          onClick={onCrearLicencia}
          disabled={actionLoading !== null}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 text-white rounded-lg"
        >
          Crear Nueva Licencia
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Info de licencia */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Licencia Actual</h3>
            <LicenciaEstadoBadge estado={licencia.estado} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <InfoItem 
              icon={CreditCard} 
              label="Plan" 
              value={<PlanBadge plan={licencia.plan} />} 
            />
            <InfoItem 
              icon={Calendar} 
              label="Fecha Inicio" 
              value={formatDate(licencia.fecha_inicio)} 
            />
            <InfoItem 
              icon={Calendar} 
              label="Fecha Fin" 
              value={licencia.fecha_fin ? formatDate(licencia.fecha_fin) : 'Sin límite'} 
            />
            <InfoItem 
              icon={Clock} 
              label="Días Restantes" 
              value={licencia.dias_restantes !== null 
                ? `${licencia.dias_restantes} días`
                : 'Sin límite'
              } 
            />
            <InfoItem 
              icon={Users} 
              label="Máx. Usuarios" 
              value={licencia.max_usuarios} 
            />
            <InfoItem 
              icon={TrendingUp} 
              label="Máx. Mesas" 
              value={licencia.max_mesas} 
            />
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Funcionalidades</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(licencia.features).map(([key, enabled]) => (
                <span
                  key={key}
                  className={`px-2 py-1 rounded text-xs ${
                    enabled 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {key.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones de licencia */}
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Gestión de Licencia</h3>
          
          <div className="space-y-2">
            <button
              onClick={onExtender}
              disabled={actionLoading !== null || licencia.estado === 'pausado'}
              className="w-full flex items-center gap-2 px-3 py-2 bg-green-600/20 text-green-400 
                       hover:bg-green-600/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
              Extender Días
            </button>

            {licencia.estado === 'pausado' ? (
              <button
                onClick={onReanudar}
                disabled={actionLoading !== null}
                className="w-full flex items-center gap-2 px-3 py-2 bg-sky-600/20 text-sky-400 
                         hover:bg-sky-600/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Reanudar Licencia
              </button>
            ) : (
              <button
                onClick={onPausar}
                disabled={actionLoading !== null}
                className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-600/20 text-yellow-400 
                         hover:bg-yellow-600/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                Pausar Licencia
              </button>
            )}

            <button
              onClick={onCambiarPlan}
              disabled={actionLoading !== null}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 
                       hover:bg-purple-600/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
              Cambiar Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabUsuarios({ 
  empresa,
  onImpersonar
}: { 
  empresa: EmpresaDetalle;
  onImpersonar: (usuario: UsuarioResumen) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Usuarios ({empresa.usuarios_resumen.length})
          </h3>
          <div className="text-sm text-slate-400">
            Límite: {empresa.licencia?.max_usuarios || empresa.metricas.total_usuarios} usuarios
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Último Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {empresa.usuarios_resumen.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 text-white font-medium">{usuario.nombre}</td>
                <td className="px-6 py-4 text-slate-300">{usuario.email}</td>
                <td className="px-6 py-4 text-slate-300">{usuario.rol_nombre || '-'}</td>
                <td className="px-6 py-4">
                  {usuario.activo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                      <CheckCircle className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                      <XCircle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {usuario.ultimo_login ? formatRelativeTime(usuario.ultimo_login) : 'Nunca'}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onImpersonar(usuario)}
                    disabled={!usuario.activo}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={usuario.activo ? "Entrar como este usuario (Modo Soporte)" : "Usuario inactivo"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Impersonar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {empresa.usuarios_resumen.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No hay usuarios registrados
          </div>
        )}
      </div>
    </div>
  );
}

function TabAuditoria({ 
  auditoria, 
  onRefresh 
}: { 
  auditoria: AuditoriaRegistro[]; 
  onRefresh: () => void;
}) {
  const getAccionLabel = (accion: string) => {
    const labels: Record<string, string> = {
      empresa_creada: 'Empresa creada',
      empresa_suspendida: 'Empresa suspendida',
      empresa_activada: 'Empresa activada',
      licencia_creada: 'Licencia creada',
      licencia_extendida: 'Licencia extendida',
      licencia_pausada: 'Licencia pausada',
      licencia_reanudada: 'Licencia reanudada',
      licencia_plan_cambiado: 'Plan cambiado',
      admin_password_reset: 'Password reseteado',
      admin_email_cambiado: 'Email cambiado',
      admin_bloqueado: 'Admin bloqueado',
      admin_desbloqueado: 'Admin desbloqueado',
      sesiones_forzadas_cierre: 'Sesiones cerradas',
      impersonacion_iniciada: '🔍 Impersonación iniciada',
      impersonacion_finalizada: '✓ Impersonación finalizada'
    };
    return labels[accion] || accion;
  };

  const renderDetalles = (detalles: Record<string, any>) => {
    if (!detalles || Object.keys(detalles).length === 0) return null;

    const items: string[] = [];
    const keyLabels: Record<string, string> = {
      motivo: 'Motivo',
      plan_nuevo: 'Nuevo plan',
      plan_anterior: 'Plan anterior',
      dias: 'Días',
      nuevoEmail: 'Nuevo email',
      emailAnterior: 'Email anterior',
      estado: 'Estado',
      dias_agregados: 'Días agregados',
      usuario_impersonado: 'Usuario',
      usuario_email: 'Email usuario',
      super_admin: 'Admin',
      ip_address: 'IP',
      rol_impersonado: 'Rol'
    };

    Object.entries(detalles).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      // Omitir campos técnicos
      if (key === 'empresa_nombre' || key === 'usuario_nombre' || key === 'licencia_estado') return;
      const label = keyLabels[key] || key;
      items.push(`${label}: ${value}`);
    });

    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {items.map((item, idx) => (
          <span key={idx} className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded border border-slate-700">
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Historial de Auditoría</h3>
        <button
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="divide-y divide-slate-700">
        {auditoria.map((registro) => (
          <div key={registro.id} className="p-4 hover:bg-slate-700/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-medium">{getAccionLabel(registro.accion)}</p>
                <p className="text-sm text-slate-400 mt-1">
                  Por: {registro.admin_email}
                </p>
                {renderDetalles(registro.detalles)}
              </div>
              <span className="text-sm text-slate-500">
                {formatRelativeTime(registro.created_at)}
              </span>
            </div>
          </div>
        ))}

        {auditoria.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No hay registros de auditoría
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function InfoItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: any; 
  label: string; 
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-slate-700 rounded-lg">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  color 
}: { 
  icon: any; 
  label: string; 
  value: React.ReactNode;
  subtext?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-500/20 text-sky-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    slate: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className={`p-2 rounded-lg w-fit ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      <p className="text-sm text-slate-400">
        {label}
        {subtext && <span className="text-slate-500"> ({subtext})</span>}
      </p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    activo: 'bg-green-500/20 text-green-400',
    suspendido: 'bg-red-500/20 text-red-400',
    pendiente: 'bg-yellow-500/20 text-yellow-400',
    prueba: 'bg-blue-500/20 text-blue-400',
    expirado: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[estado] || styles.pendiente}`}>
      {estado === 'activo' && <CheckCircle className="w-4 h-4" />}
      {estado === 'suspendido' && <XCircle className="w-4 h-4" />}
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}

function LicenciaEstadoBadge({ estado }: { estado: string }) {
  // Sin estado moroso - rojo para expirado
  const styles: Record<string, string> = {
    activo: 'bg-green-500/20 text-green-400',
    prueba: 'bg-blue-500/20 text-blue-400',
    pausado: 'bg-yellow-500/20 text-yellow-400',
    expirado: 'bg-red-500/20 text-red-400'
  };

  const icons: Record<string, any> = {
    activo: CheckCircle,
    prueba: Clock,
    pausado: Pause,
    expirado: XCircle
  };

  const Icon = icons[estado] || AlertCircle;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[estado] || styles.activo}`}>
      <Icon className="w-4 h-4" />
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    ninguno: 'bg-slate-700 text-slate-400',
    basico: 'bg-slate-500/20 text-slate-300',
    profesional: 'bg-blue-500/20 text-blue-400',
    enterprise: 'bg-purple-500/20 text-purple-400'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[plan] || styles.basico}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

// ============================================
// MODALES
// ============================================

function ExtenderModal({ 
  onClose, 
  onConfirm, 
  loading 
}: {
  onClose: () => void;
  onConfirm: (dias: number, motivo: string) => void;
  loading: boolean;
}) {
  const [dias, setDias] = useState(30);
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Extender Licencia</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Días a extender
            </label>
            <input
              type="number"
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(dias, motivo)}
            disabled={loading || dias < 1}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 
                     text-white rounded-lg font-medium"
          >
            {loading ? 'Extendiendo...' : 'Extender'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PausarModal({ 
  onClose, 
  onConfirm, 
  loading 
}: {
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  loading: boolean;
}) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Pausar Licencia</h2>
        
        <p className="text-slate-400 mb-4">
          La licencia se pausará y el cliente no podrá acceder al sistema. 
          Al reanudar, se extenderá automáticamente por los días pausados.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Motivo *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej: Solicitud del cliente, problema de pago..."
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                     text-white focus:outline-none focus:border-sky-500"
            required
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={loading || !motivo.trim()}
            className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 
                     text-white rounded-lg font-medium"
          >
            {loading ? 'Pausando...' : 'Pausar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CambiarPlanModal({ 
  planActual,
  licencia,
  onClose, 
  onConfirm, 
  loading 
}: {
  planActual: string;
  licencia: LicenciaDetalle;
  onClose: () => void;
  onConfirm: (nuevoPlan: string, motivo: string) => void;
  loading: boolean;
}) {
  const [nuevoPlan, setNuevoPlan] = useState(planActual);
  const [motivo, setMotivo] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [planesConfig, setPlanesConfig] = useState<Record<string, {
    id: string;
    nombre: string;
    descripcion: string;
    precio_anual: number;
    max_usuarios: number;
    max_mesas: number;
    duracion_dias: number;
    features: Record<string, boolean>;
    activo: boolean;
  }> | null>(null);
  const [loadingPlanes, setLoadingPlanes] = useState(true);

  // Cargar configuración de planes desde la API
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/planes', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPlanesConfig(data);
        }
      } catch (err) {
        console.error('Error al cargar planes:', err);
      } finally {
        setLoadingPlanes(false);
      }
    };
    cargarPlanes();
  }, []);

  // Convertir a array para iterar
  const planes = planesConfig 
    ? Object.values(planesConfig).filter(p => p.activo)
    : [];

  // Obtener precio de un plan
  const getPrecioPlan = (planId: string): number => {
    return planesConfig?.[planId]?.precio_anual || 0;
  };

  // Formatear precio en COP
  const formatPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(valor);
  };

  // Calcular prorrateo
  const calcularProrrateo = () => {
    const diasRestantes = licencia.dias_restantes || 0;
    const diasTotales = planesConfig?.[planActual]?.duracion_dias || 365;
    
    const precioActual = getPrecioPlan(planActual);
    const precioNuevo = getPrecioPlan(nuevoPlan);
    
    // Valor diario del plan actual
    const valorDiarioActual = precioActual / diasTotales;
    
    // Crédito por días no usados
    const creditoDiasNoUsados = Math.round(valorDiarioActual * diasRestantes);
    
    // Total a pagar (nuevo plan - crédito)
    const totalAPagar = precioNuevo - creditoDiasNoUsados;
    
    // Días usados
    const diasUsados = diasTotales - diasRestantes;
    
    return {
      diasRestantes,
      diasUsados,
      valorDiarioActual: Math.round(valorDiarioActual),
      creditoDiasNoUsados,
      precioNuevoPlan: precioNuevo,
      totalAPagar: Math.max(0, totalAPagar), // No puede ser negativo
      saldoAFavor: totalAPagar < 0 ? Math.abs(totalAPagar) : 0
    };
  };

  const prorrateo = calcularProrrateo();
  const planSeleccionado = planes.find(p => p.id === nuevoPlan);
  const planActualConfig = planes.find(p => p.id === planActual);

  const handleConfirmar = () => {
    if (!mostrarConfirmacion) {
      setMostrarConfirmacion(true);
      return;
    }
    onConfirm(nuevoPlan, motivo);
  };

  if (loadingPlanes) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-2">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Cambiar Plan</h2>
        
        {!mostrarConfirmacion ? (
          <div className="space-y-4">
            {/* Selección de planes */}
            <div className="space-y-2">
              {planes.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer border ${
                    nuevoPlan === plan.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={nuevoPlan === plan.id}
                      onChange={(e) => setNuevoPlan(e.target.value)}
                      className="text-sky-500"
                    />
                    <div>
                      <p className="text-white font-medium">{plan.nombre}</p>
                      <p className="text-sm text-slate-400">
                        {plan.max_usuarios} usuarios, {plan.max_mesas} mesas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatPrecio(plan.precio_anual)}</p>
                    <p className="text-xs text-slate-500">por año</p>
                    {planActual === plan.id && (
                      <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded mt-1 inline-block">Actual</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Cálculo de prorrateo (solo si cambia de plan) */}
            {nuevoPlan !== planActual && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cálculo de Prorrateo
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Días restantes de licencia actual:</span>
                    <span className="text-white">{prorrateo.diasRestantes} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor diario plan actual:</span>
                    <span className="text-white">{formatPrecio(prorrateo.valorDiarioActual)}</span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Crédito por días no usados:</span>
                    <span>-{formatPrecio(prorrateo.creditoDiasNoUsados)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Precio nuevo plan ({planSeleccionado?.nombre}):</span>
                      <span className="text-white">{formatPrecio(prorrateo.precioNuevoPlan)}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2">
                    {prorrateo.saldoAFavor > 0 ? (
                      <div className="flex justify-between text-green-400 font-medium">
                        <span>Saldo a favor del cliente:</span>
                        <span>{formatPrecio(prorrateo.saldoAFavor)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-white font-medium text-lg">
                        <span>Total a pagar:</span>
                        <span>{formatPrecio(prorrateo.totalAPagar)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Motivo del cambio (opcional)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Ej: Upgrade solicitado por cliente, necesita más usuarios..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                         text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={loading || nuevoPlan === planActual}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 
                         text-white rounded-lg font-medium"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          /* Pantalla de confirmación */
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Confirmar cambio de plan
              </h3>
              <p className="text-sm text-slate-300">
                Está a punto de cambiar el plan de <strong>{planActualConfig?.nombre || planActual}</strong> a <strong>{planSeleccionado?.nombre}</strong>.
              </p>
            </div>

            <div className="bg-slate-900 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Resumen del cambio:</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Plan actual: {planActualConfig?.nombre || planActual} → Nuevo: {planSeleccionado?.nombre}</li>
                <li>• Usuarios máx: {planActualConfig?.max_usuarios} → {planSeleccionado?.max_usuarios}</li>
                <li>• Mesas máx: {planActualConfig?.max_mesas} → {planSeleccionado?.max_mesas}</li>
                {prorrateo.saldoAFavor > 0 ? (
                  <li className="text-green-400">• Saldo a favor: {formatPrecio(prorrateo.saldoAFavor)}</li>
                ) : (
                  <li className="text-yellow-400">• Diferencia a cobrar: {formatPrecio(prorrateo.totalAPagar)}</li>
                )}
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmar}
                disabled={loading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 
                         text-white rounded-lg font-medium"
              >
                {loading ? 'Cambiando...' : 'Confirmar Cambio'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CambiarEmailModal({ 
  emailActual,
  onClose, 
  onConfirm, 
  loading 
}: {
  emailActual: string;
  onClose: () => void;
  onConfirm: (nuevoEmail: string) => void;
  loading: boolean;
}) {
  const [nuevoEmail, setNuevoEmail] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Cambiar Email del Admin</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Email actual
            </label>
            <p className="text-white">{emailActual}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nuevo email *
            </label>
            <input
              type="email"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              placeholder="nuevo@email.com"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(nuevoEmail)}
            disabled={loading || !nuevoEmail.trim() || nuevoEmail === emailActual}
            className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 
                     text-white rounded-lg font-medium"
          >
            {loading ? 'Cambiando...' : 'Cambiar Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL CREAR LICENCIA
// ============================================

function CrearLicenciaModal({ 
  onClose, 
  onConfirm, 
  loading 
}: {
  onClose: () => void;
  onConfirm: (plan: string, duracionDias: number, incluyePrueba: boolean, notas: string) => void;
  loading: boolean;
}) {
  const [plan, setPlan] = useState('basico');
  const [duracionAnios, setDuracionAnios] = useState(1);
  const [incluyePrueba, setIncluyePrueba] = useState(false);
  const [diasPrueba, setDiasPrueba] = useState(30);
  const [notas, setNotas] = useState('');
  const [planesConfig, setPlanesConfig] = useState<Record<string, {
    id: string;
    nombre: string;
    descripcion: string;
    precio_anual: number;
    max_usuarios: number;
    max_mesas: number;
    duracion_dias: number;
    features: Record<string, boolean>;
    activo: boolean;
  }> | null>(null);
  const [loadingPlanes, setLoadingPlanes] = useState(true);

  // Cargar configuración de planes desde la API
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/planes', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPlanesConfig(data);
        }
      } catch (err) {
        console.error('Error al cargar planes:', err);
      } finally {
        setLoadingPlanes(false);
      }
    };
    cargarPlanes();
  }, []);

  // Convertir a array para iterar
  const planes = planesConfig 
    ? Object.values(planesConfig).filter(p => p.activo)
    : [];

  // Formatear precio en COP
  const formatPrecioCOP = (precio: number | null): string => {
    if (precio === null || precio === 0) return 'Personalizado';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  };

  // Obtener duración del plan seleccionado
  const duracionPlanSeleccionado = planesConfig?.[plan]?.duracion_dias || 365;

  const duraciones = [
    { anios: 1, label: `1 año (${duracionPlanSeleccionado} días)`, dias: duracionPlanSeleccionado },
    { anios: 2, label: `2 años (${duracionPlanSeleccionado * 2} días)`, dias: duracionPlanSeleccionado * 2 },
    { anios: 3, label: `3 años (${duracionPlanSeleccionado * 3} días)`, dias: duracionPlanSeleccionado * 3 }
  ];

  // Calcular días totales
  const duracionSeleccionada = duraciones.find(d => d.anios === duracionAnios);
  const diasLicencia = duracionSeleccionada?.dias || duracionPlanSeleccionado;
  const diasTotales = incluyePrueba ? diasPrueba : diasLicencia;

  const handleConfirm = () => {
    onConfirm(plan, diasTotales, incluyePrueba, notas);
  };

  if (loadingPlanes) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-2">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Crear Nueva Licencia</h2>
        
        <div className="space-y-4">
          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Plan
            </label>
            <div className="space-y-2">
              {planes.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${
                    plan === p.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      value={p.id}
                      checked={plan === p.id}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-4 h-4 text-sky-500"
                    />
                    <div>
                      <span className="text-white font-medium">{p.nombre}</span>
                      <p className="text-xs text-slate-400">
                        {p.max_usuarios} usuarios, {p.max_mesas} mesas
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-400">{formatPrecioCOP(p.precio_anual)}/año</span>
                </label>
              ))}
            </div>
          </div>

          {/* Periodo de prueba (opcional) */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={incluyePrueba}
                onChange={(e) => setIncluyePrueba(e.target.checked)}
                className="w-4 h-4 text-sky-500 rounded"
              />
              <div>
                <span className="text-white font-medium">Incluir periodo de prueba</span>
                <p className="text-xs text-slate-400">La licencia iniciará en modo prueba</p>
              </div>
            </label>
            
            {incluyePrueba && (
              <div className="mt-3 ml-7">
                <label className="block text-sm text-slate-300 mb-1">Días de prueba</label>
                <input
                  type="number"
                  value={diasPrueba}
                  onChange={(e) => setDiasPrueba(Math.max(1, parseInt(e.target.value) || 30))}
                  min={1}
                  max={90}
                  className="w-24 px-3 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Al expirar, cambiará a estado "expirado"</p>
              </div>
            )}
          </div>

          {/* Duración (solo si no es prueba) */}
          {!incluyePrueba && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duración de la licencia
              </label>
              <select
                value={duracionAnios}
                onChange={(e) => setDuracionAnios(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                         text-white focus:outline-none focus:border-sky-500"
              >
                {duraciones.map((d) => (
                  <option key={d.anios} value={d.anios}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Resumen */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <p className="text-sm text-slate-400">Resumen:</p>
            <p className="text-white font-medium">
              {incluyePrueba 
                ? `Prueba de ${diasPrueba} días` 
                : `Licencia de ${diasLicencia} días (${duracionAnios} año${duracionAnios > 1 ? 's' : ''})`
              }
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej: Licencia de cortesía, descuento especial..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 
                     text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando...
              </>
            ) : (
              incluyePrueba ? 'Iniciar Prueba' : 'Crear Licencia'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL ELIMINAR EMPRESA (SOFT DELETE SEGURO)
// ============================================

const MOTIVOS_ELIMINACION = [
  { id: 'solicitud_cliente', label: 'Solicitud del cliente' },
  { id: 'incumplimiento_pago', label: 'Incumplimiento de pago' },
  { id: 'violacion_terminos', label: 'Violación de términos de servicio' },
  { id: 'fraude_detectado', label: 'Fraude detectado' },
  { id: 'empresa_duplicada', label: 'Empresa duplicada' },
  { id: 'cierre_negocio', label: 'Cierre del negocio' },
  { id: 'otro', label: 'Otro (especificar)' }
];

function EliminarEmpresaModal({ 
  empresaNombre,
  onClose, 
  onConfirm, 
  loading 
}: {
  empresaNombre: string;
  onClose: () => void;
  onConfirm: (motivo: string, motivoDetalle: string, confirmacionTexto: string, passwordAdmin: string) => void;
  loading: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');
  const [passwordAdmin, setPasswordAdmin] = useState('');

  const confirmacionEsperada = `ELIMINAR ${empresaNombre}`;
  const confirmacionValida = confirmacionTexto === confirmacionEsperada;
  const motivoValido = motivo && (motivo !== 'otro' || motivoDetalle.trim().length >= 10);
  const formValido = confirmacionValida && motivoValido && passwordAdmin.length >= 6;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 border-2 border-red-600/50">
        {/* Header de advertencia */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-red-900/30 rounded-lg border border-red-600/50">
          <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-red-400">⚠️ Eliminar Empresa</h2>
            <p className="text-sm text-red-300 mt-1">
              Esta acción desactiva permanentemente la empresa y bloquea todos sus accesos.
            </p>
          </div>
        </div>

        {/* Advertencias */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Al eliminar esta empresa:</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Todos los usuarios serán desactivados
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Todas las sesiones activas serán cerradas
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              La licencia será cancelada
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              No podrán iniciar sesión nuevamente
            </li>
            <li className="flex items-center gap-2 text-slate-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Los datos históricos se conservan para auditoría
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Motivo de eliminación *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Seleccionar motivo...</option>
              {MOTIVOS_ELIMINACION.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Detalle si es "otro" */}
          {motivo === 'otro' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Especificar motivo * (mínimo 10 caracteres)
              </label>
              <textarea
                value={motivoDetalle}
                onChange={(e) => setMotivoDetalle(e.target.value)}
                rows={2}
                placeholder="Describa el motivo de la eliminación..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                         text-white focus:outline-none focus:border-red-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                {motivoDetalle.length}/10 caracteres mínimo
              </p>
            </div>
          )}

          {/* Confirmación textual */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Para confirmar, escriba exactamente:
            </label>
            <div className="p-2 bg-slate-900/50 rounded mb-2 font-mono text-sm text-red-400">
              {confirmacionEsperada}
            </div>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="Escriba la confirmación..."
              className={`w-full px-4 py-2 bg-slate-900 border rounded-lg text-white 
                       focus:outline-none ${
                         confirmacionTexto.length > 0
                           ? confirmacionValida
                             ? 'border-green-500'
                             : 'border-red-500'
                           : 'border-slate-700 focus:border-red-500'
                       }`}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Su contraseña de Super Admin *
            </label>
            <input
              type="password"
              value={passwordAdmin}
              onChange={(e) => setPasswordAdmin(e.target.value)}
              placeholder="Ingrese su contraseña..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-red-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Requerida para verificar su identidad
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo, motivoDetalle, confirmacionTexto, passwordAdmin)}
            disabled={loading || !formValido}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed
                     text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar Empresa
              </>
            )}
          </button>
        </div>

        {!formValido && (
          <p className="text-xs text-center text-slate-500 mt-3">
            Complete todos los campos correctamente para habilitar el botón
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE NOTIFICACIONES
// ============================================

function NotificacionesContainer({ 
  notificaciones, 
  onCerrar 
}: { 
  notificaciones: Notificacion[];
  onCerrar: (id: string) => void;
}) {
  if (notificaciones.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notificaciones.map((notif) => (
        <NotificacionToast key={notif.id} notificacion={notif} onCerrar={onCerrar} />
      ))}
    </div>
  );
}

function NotificacionToast({ 
  notificacion, 
  onCerrar 
}: { 
  notificacion: Notificacion;
  onCerrar: (id: string) => void;
}) {
  const estilos = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  };

  const iconos = {
    success: CheckCircle,
    error: XCircle,
    info: AlertCircle,
    warning: AlertTriangle
  };

  const Icon = iconos[notificacion.tipo];

  return (
    <div className={`${estilos[notificacion.tipo]} border rounded-lg p-4 shadow-lg animate-slide-in-right flex items-start gap-3`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{notificacion.mensaje}</p>
        {notificacion.detalles && (
          <p className="text-sm opacity-80 mt-1">{notificacion.detalles}</p>
        )}
      </div>
      <button
        onClick={() => onCerrar(notificacion.id)}
        className="text-current opacity-60 hover:opacity-100"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// MODAL DE CONTRASEÑA TEMPORAL
// ============================================

function PasswordTemporalModal({ 
  password, 
  onClose 
}: {
  password: string;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiarPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Key className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Contraseña Temporal Generada</h3>
              <p className="text-sm text-slate-400">Copie y comunique al cliente de forma segura</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-4">
            <div className="flex items-center justify-between gap-3">
              <code className="text-2xl font-mono text-sky-400 tracking-wider select-all">
                {password}
              </code>
              <button
                onClick={copiarPassword}
                className={`p-2 rounded-lg transition-colors ${
                  copiado 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title={copiado ? 'Copiado!' : 'Copiar contraseña'}
              >
                {copiado ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium">Importante:</p>
                <ul className="mt-1 space-y-1 text-yellow-200/80">
                  <li>• Esta contraseña es temporal y debe cambiarse en el primer login</li>
                  <li>• Comuníquela al cliente por un canal seguro</li>
                  <li>• No la comparta por email sin cifrar</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL DE CONFIRMACIÓN GENÉRICO
// ============================================

function ConfirmModal({
  titulo,
  mensaje,
  onClose,
  onConfirm,
  loading,
  textoConfirmar = 'Confirmar',
  tipoPeligro = false
}: {
  titulo: string;
  mensaje: string;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  textoConfirmar?: string;
  tipoPeligro?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 ${tipoPeligro ? 'bg-red-500/20' : 'bg-yellow-500/20'} rounded-lg`}>
              <AlertTriangle className={`w-6 h-6 ${tipoPeligro ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
            <h3 className="text-lg font-semibold text-white">{titulo}</h3>
          </div>

          <p className="text-slate-300 mb-6">{mensaje}</p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                tipoPeligro 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                textoConfirmar
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return formatDate(dateString);
}
