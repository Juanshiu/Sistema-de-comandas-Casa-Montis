'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Users, FileCheck, TrendingUp, 
  Plus, LogOut, RefreshCw, AlertTriangle,
  CheckCircle, Clock, Ban, Trash2, Settings
} from 'lucide-react';

interface DashboardStats {
  empresas: {
    total: number;
    activas: number;
    suspendidas: number;
    enPrueba: number;
  };
  licencias: {
    activas: number;
    porExpirar: number;
    expiradas: number;
  };
  usuarios: {
    total: number;
  };
}

interface Empresa {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  plan_actual: string;
  email_contacto: string | null;
  created_at: string;
  usuarios_count: number;
  deleted_at?: string | null;
  delete_reason?: string | null;
  licencia_activa: {
    plan: string;
    estado: string;
    dias_restantes: number | null;
  } | null;
}

// Filtro de vista de empresas
type EmpresasViewFilter = 'activas' | 'eliminadas';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasEliminadas, setEmpresasEliminadas] = useState<Empresa[]>([]);
  const [viewFilter, setViewFilter] = useState<EmpresasViewFilter>('activas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, empresasRes, eliminadasRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: getAuthHeaders() }),
        fetch('/api/admin/empresas', { headers: getAuthHeaders() }),
        fetch('/api/admin/empresas-eliminadas', { headers: getAuthHeaders() })
      ]);

      if (statsRes.status === 401 || empresasRes.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/login');
        return;
      }

      if (!statsRes.ok || !empresasRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [statsData, empresasData] = await Promise.all([
        statsRes.json(),
        empresasRes.json()
      ]);

      // Empresas eliminadas es opcional (no falla si error)
      let eliminadasData: Empresa[] = [];
      if (eliminadasRes.ok) {
        eliminadasData = await eliminadasRes.json();
      }

      setStats(statsData);
      setEmpresas(empresasData);
      setEmpresasEliminadas(eliminadasData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = localStorage.getItem('admin_user');
    if (user) {
      setAdminUser(JSON.parse(user));
    }

    fetchData();
  }, [router, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const handleChangeEstado = async (empresaId: string, nuevoEstado: 'activo' | 'suspendido') => {
    try {
      const response = await fetch(`/api/admin/empresas/${empresaId}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cambiar estado');
      }

      // Recargar datos
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-sky-500" />
              <h1 className="text-xl font-bold text-white">Panel Admin SaaS</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/planes')}
                className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white 
                         hover:bg-slate-700 rounded-lg transition-colors"
                title="Configuración de Planes"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Planes</span>
              </button>
              <span className="text-slate-400 text-sm">
                {adminUser?.nombre || 'Admin'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white 
                         hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Empresas Activas"
            value={stats?.empresas.activas || 0}
            total={stats?.empresas.total}
            icon={Building2}
            color="sky"
          />
          <StatCard
            title="Usuarios Total"
            value={stats?.usuarios.total || 0}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Licencias Activas"
            value={stats?.licencias.activas || 0}
            icon={FileCheck}
            color="purple"
          />
          <StatCard
            title="Por Expirar (30d)"
            value={stats?.licencias.porExpirar || 0}
            icon={Clock}
            color={stats?.licencias.porExpirar ? 'yellow' : 'slate'}
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-300">En Prueba</span>
            </div>
            <span className="text-2xl font-bold text-white">{stats?.empresas.enPrueba || 0}</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-slate-300">Suspendidas</span>
            </div>
            <span className="text-2xl font-bold text-white">{stats?.empresas.suspendidas || 0}</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-slate-300">Expiradas</span>
            </div>
            <span className="text-2xl font-bold text-white">{stats?.licencias.expiradas || 0}</span>
          </div>
        </div>

        {/* Empresas Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white">Empresas (Tenants)</h2>
              
              {/* Toggle de vista */}
              <div className="flex rounded-lg overflow-hidden border border-slate-600">
                <button
                  onClick={() => setViewFilter('activas')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewFilter === 'activas'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Activas ({empresas.length})
                </button>
                <button
                  onClick={() => setViewFilter('eliminadas')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewFilter === 'eliminadas'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminadas ({empresasEliminadas.length})
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              {viewFilter === 'activas' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 
                           text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Empresa
                </button>
              )}
            </div>
          </div>

          {viewFilter === 'activas' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Licencia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-white">{empresa.nombre}</div>
                          <div className="text-sm text-slate-400">{empresa.email_contacto || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <EstadoBadge estado={empresa.estado} />
                      </td>
                      <td className="px-6 py-4">
                        {empresa.licencia_activa ? (
                          <PlanBadge plan={empresa.plan_actual} />
                        ) : (
                          <span className="text-slate-500 italic text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {empresa.usuarios_count}
                      </td>
                      <td className="px-6 py-4">
                        {empresa.licencia_activa ? (
                          <LicenciaEstadoBadge 
                            estado={empresa.licencia_activa.estado}
                            diasRestantes={empresa.licencia_activa.dias_restantes}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-400">
                            Sin licencia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/empresa/${empresa.id}`)}
                            className="text-sky-400 hover:text-sky-300 text-sm font-medium"
                          >
                            Ver / Administrar
                          </button>
                          {empresa.estado === 'activo' ? (
                            <button
                              onClick={() => handleChangeEstado(empresa.id, 'suspendido')}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeEstado(empresa.id, 'activo')}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Vista de empresas eliminadas */
            <div className="overflow-x-auto">
              {empresasEliminadas.length === 0 ? (
                <div className="p-8 text-center">
                  <Trash2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay empresas eliminadas</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-red-900/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                        Fecha Eliminación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                        Motivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-400 uppercase tracking-wider">
                        Usuarios
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {empresasEliminadas.map((empresa) => (
                      <tr key={empresa.id} className="hover:bg-red-900/10">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-400 line-through">{empresa.nombre}</div>
                            <div className="text-sm text-slate-500">{empresa.email_contacto || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {empresa.deleted_at 
                            ? new Date(empresa.deleted_at).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {empresa.delete_reason || 'Sin especificar'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {empresa.usuarios_count} (desactivados)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                  ⚠️ Las empresas eliminadas solo pueden ser restauradas mediante intervención manual en la base de datos.
                  Los datos históricos se conservan para auditoría y cumplimiento legal.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear Empresa */}
      {showCreateModal && (
        <CreateEmpresaModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </div>
  );
}

// Componentes auxiliares

function StatCard({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  total?: number; 
  icon: any; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    sky: 'bg-sky-500/20 text-sky-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    slate: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {total !== undefined && (
          <span className="text-sm text-slate-400">de {total}</span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    activo: 'bg-green-500/20 text-green-400',
    suspendido: 'bg-red-500/20 text-red-400',
    pendiente: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[estado] || styles.pendiente}`}>
      {estado === 'activo' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
      {estado}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    ninguno: 'bg-slate-700 text-slate-400',
    basico: 'bg-slate-500/20 text-slate-300',
    profesional: 'bg-blue-500/20 text-blue-400',
    enterprise: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[plan] || styles.basico}`}>
      {plan}
    </span>
  );
}

function LicenciaEstadoBadge({ estado, diasRestantes }: { estado: string; diasRestantes: number | null }) {
  // Sin estado moroso - rojo para expirado
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    activo: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✓' },
    prueba: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '⏳' },
    pausado: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⏸' },
    expirado: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '✕' },
  };

  const { bg, text, icon } = config[estado] || config.activo;
  
  // Alerta si quedan pocos días
  const alertaDias = diasRestantes !== null && diasRestantes <= 30 && diasRestantes > 0;

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <span>{icon}</span>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
      {diasRestantes !== null && (
        <span className={`text-xs ${alertaDias ? 'text-orange-400' : 'text-slate-500'}`}>
          {diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Vencida'}
        </span>
      )}
    </div>
  );
}

function CreateEmpresaModal({ 
  onClose, 
  onSuccess, 
  getAuthHeaders 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
  getAuthHeaders: () => Record<string, string>;
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    nombreAdmin: '',
    emailAdmin: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/empresas', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear empresa');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">¡Empresa Creada!</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Empresa</div>
              <div className="font-medium text-white">{result.empresa.nombre}</div>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4">
              <div className="text-sm text-sky-400 mb-2 font-medium">📋 Credenciales para el Cliente</div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">Empresa (correo admin)</div>
                  <div className="font-mono text-sm text-white bg-slate-900 px-2 py-1 rounded mt-1 select-all">
                    {result.usuarioAdmin.email}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400">Email del Admin (para login)</div>
                  <div className="font-mono text-sm text-white bg-slate-900 px-2 py-1 rounded mt-1 select-all">
                    {result.usuarioAdmin.email}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-400 mt-3">
                💡 El admin usa su email tanto como identificador de empresa como para iniciar sesión.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-sm text-yellow-400 mb-1 font-medium">⚠️ Password Temporal</div>
              <div className="font-mono text-lg text-white bg-slate-900 px-3 py-2 rounded mt-2 select-all">
                {result.usuarioAdmin.passwordTemporal}
              </div>
              <p className="text-xs text-yellow-400/70 mt-2">
                Comunique estas credenciales al cliente de forma segura
              </p>
            </div>
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Crear Nueva Empresa</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nombre del Admin *
            </label>
            <input
              type="text"
              value={formData.nombreAdmin}
              onChange={(e) => setFormData({ ...formData, nombreAdmin: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email del Admin *
            </label>
            <input
              type="email"
              value={formData.emailAdmin}
              onChange={(e) => setFormData({ ...formData, emailAdmin: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg 
                       text-white focus:outline-none focus:border-sky-500"
            />
          </div>



          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 
                       text-white rounded-lg font-medium"
            >
              {loading ? 'Creando...' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
