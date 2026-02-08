/**
 * Rutas del Panel Master Admin SaaS
 * FASE 2.2 - Consolidación SaaS
 * FASE 2.3 - Panel Master Admin Avanzado
 * 
 * Namespace: /api/admin
 * 
 * ⚠️ TODAS estas rutas requieren autenticación de Super Admin
 * ⚠️ NO tienen empresa_id - son globales del SaaS
 * 
 * Endpoints Base:
 * - POST   /api/admin/login         - Login super admin
 * - POST   /api/admin/setup         - Crear primer super admin (solo una vez)
 * - GET    /api/admin/dashboard     - Estadísticas del SaaS
 * - GET    /api/admin/me            - Info del super admin actual
 * 
 * Endpoints Empresas:
 * - GET    /api/admin/empresas              - Listar todas las empresas
 * - POST   /api/admin/empresas              - Crear nueva empresa (tenant)
 * - GET    /api/admin/empresas/:id          - Detalle completo de empresa
 * - PATCH  /api/admin/empresas/:id/estado   - Cambiar estado empresa
 * - POST   /api/admin/empresas/:id/reset-password   - Resetear password admin
 * - POST   /api/admin/empresas/:id/cambiar-email    - Cambiar email admin
 * - POST   /api/admin/empresas/:id/toggle-bloqueo   - Bloquear/desbloquear admin
 * - POST   /api/admin/empresas/:id/cerrar-sesiones  - Forzar cierre de sesiones
 * - GET    /api/admin/empresas/:id/auditoria        - Auditoría de empresa
 * 
 * Endpoints Licencias:
 * - GET    /api/admin/licencias             - Listar licencias
 * - POST   /api/admin/licencias             - Crear nueva licencia
 * - POST   /api/admin/licencias/:id/extender    - Extender licencia
 * - POST   /api/admin/licencias/:id/pausar      - Pausar licencia
 * - POST   /api/admin/licencias/:id/reanudar    - Reanudar licencia
 * - POST   /api/admin/empresas/:id/cambiar-plan - Cambiar plan
 * 
 * Endpoints Auditoría:
 * - GET    /api/admin/auditoria             - Auditoría global
 * 
 * Endpoints Impersonación:
 * - POST   /api/admin/impersonar            - Iniciar sesión de impersonación
 * - POST   /api/admin/impersonar/salir      - Finalizar impersonación
 * - GET    /api/admin/impersonaciones       - Historial de impersonaciones
 */

import { Router, Request, Response } from 'express';
import { SaasAdminService } from '../services/saasAdminService';
import { 
  verificarSuperAdmin, 
  SuperAdminAuthService 
} from '../middleware/superAdminMiddleware';
import { PlanType } from '../types/saas-admin.types';
import { db } from '../database/database';

const router = Router();
const saasAdminService = new SaasAdminService();
const superAdminAuth = new SuperAdminAuthService();

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

/**
 * POST /api/admin/login
 * Login específico para super admin
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    const result = await superAdminAuth.login(email, password);
    res.json(result);
  } catch (error: any) {
    console.error('Error en login super admin:', error);
    res.status(401).json({ error: error.message || 'Error de autenticación' });
  }
});

/**
 * POST /api/admin/setup
 * Crear el primer super admin del sistema
 * Solo funciona si no existe ningún super admin
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ 
        error: 'nombre, email y password son requeridos' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'El password debe tener al menos 8 caracteres' 
      });
    }

    const superAdmin = await superAdminAuth.crearPrimerSuperAdmin(
      nombre, 
      email, 
      password
    );

    res.status(201).json({
      message: 'Super Admin creado exitosamente',
      superAdmin
    });
  } catch (error: any) {
    console.error('Error en setup:', error);
    res.status(400).json({ error: error.message || 'Error al crear Super Admin' });
  }
});

// ============================================
// RUTAS PROTEGIDAS (requieren Super Admin)
// ============================================

// Aplicar middleware de super admin a todas las rutas siguientes
router.use(verificarSuperAdmin);

/**
 * GET /api/admin/dashboard
 * Obtener estadísticas del SaaS
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const stats = await saasAdminService.obtenerEstadisticas();
    res.json(stats);
  } catch (error: any) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/admin/empresas
 * Listar todas las empresas (tenants)
 */
router.get('/empresas', async (req: Request, res: Response) => {
  try {
    const { estado } = req.query;
    const empresas = await saasAdminService.listarEmpresas(
      estado ? { estado: estado as string } : undefined
    );
    res.json(empresas);
  } catch (error: any) {
    console.error('Error al listar empresas:', error);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

/**
 * POST /api/admin/empresas
 * Crear nueva empresa (tenant) con usuario admin
 * Este es el endpoint principal de onboarding controlado
 */
router.post('/empresas', async (req: Request, res: Response) => {
  try {
    const { nombre, emailAdmin, nombreAdmin, telefono, direccion } = req.body;

    if (!nombre || !emailAdmin || !nombreAdmin) {
      return res.status(400).json({ 
        error: 'nombre, emailAdmin y nombreAdmin son requeridos' 
      });
    }

    const resultado = await saasAdminService.crearTenant({
      nombre,
      emailAdmin,
      nombreAdmin,
      telefono,
      direccion
    });

    // Log de auditoría
    console.log(`[ADMIN] Empresa creada: ${resultado.empresa.nombre} por ${req.superAdminContext?.email}`);

    res.status(201).json({
      message: 'Empresa y usuario admin creados exitosamente',
      ...resultado,
      nota: 'IMPORTANTE: Comunique el password temporal al cliente de forma segura'
    });
  } catch (error: any) {
    console.error('Error al crear empresa:', error);
    res.status(400).json({ error: error.message || 'Error al crear empresa' });
  }
});

/**
 * PATCH /api/admin/empresas/:id/estado
 * Cambiar estado de una empresa (activar/suspender)
 */
router.patch('/empresas/:id/estado', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !['activo', 'suspendido'].includes(estado)) {
      return res.status(400).json({ 
        error: 'Estado debe ser "activo" o "suspendido"' 
      });
    }

    const resultado = await saasAdminService.cambiarEstadoEmpresa(id, estado);

    // Log de auditoría
    console.log(`[ADMIN] Empresa ${id} -> ${estado} por ${req.superAdminContext?.email}`);

    res.json({
      message: `Empresa ${estado === 'activo' ? 'activada' : 'suspendida'} exitosamente`,
      ...resultado
    });
  } catch (error: any) {
    console.error('Error al cambiar estado:', error);
    res.status(400).json({ error: error.message || 'Error al cambiar estado' });
  }
});

/**
 * GET /api/admin/licencias
 * Listar todas las licencias
 */
router.get('/licencias', async (req: Request, res: Response) => {
  try {
    const { estado, plan } = req.query;
    const licencias = await saasAdminService.listarLicencias({
      estado: estado as string | undefined,
      plan: plan as string | undefined
    });
    res.json(licencias);
  } catch (error: any) {
    console.error('Error al listar licencias:', error);
    res.status(500).json({ error: 'Error al listar licencias' });
  }
});

/**
 * POST /api/admin/licencias
 * Crear nueva licencia para una empresa existente
 */
router.post('/licencias', async (req: Request, res: Response) => {
  try {
    const { empresaId, plan, duracionDias, esPrueba, maxUsuarios, maxMesas, notas } = req.body;

    if (!empresaId || !plan || !duracionDias) {
      return res.status(400).json({ 
        error: 'empresaId, plan y duracionDias son requeridos' 
      });
    }

    if (!['basico', 'profesional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ 
        error: 'Plan debe ser: basico, profesional o enterprise' 
      });
    }

    const licencia = await saasAdminService.crearLicencia({
      empresaId,
      plan,
      duracionDias: parseInt(duracionDias, 10),
      esPrueba: esPrueba === true,
      maxUsuarios: maxUsuarios ? parseInt(maxUsuarios, 10) : undefined,
      maxMesas: maxMesas ? parseInt(maxMesas, 10) : undefined,
      notas
    });

    // Log de auditoría
    console.log(`[ADMIN] Licencia creada para empresa ${empresaId} por ${req.superAdminContext?.email}`);

    res.status(201).json({
      message: 'Licencia creada exitosamente',
      licencia
    });
  } catch (error: any) {
    console.error('Error al crear licencia:', error);
    res.status(400).json({ error: error.message || 'Error al crear licencia' });
  }
});

/**
 * GET /api/admin/me
 * Obtener información del super admin actual
 */
router.get('/me', async (req: Request, res: Response) => {
  res.json(req.superAdminContext);
});

// ============================================
// FASE 2.3 - ENDPOINTS AVANZADOS
// ============================================

/**
 * GET /api/admin/empresas/:id
 * Obtener detalle completo de una empresa
 */
router.get('/empresas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const detalle = await saasAdminService.obtenerDetalleEmpresa(id);
    res.json(detalle);
  } catch (error: any) {
    console.error('Error al obtener detalle empresa:', error);
    res.status(404).json({ error: error.message || 'Empresa no encontrada' });
  }
});

/**
 * POST /api/admin/empresas/:id/reset-password
 * Resetear contraseña del admin principal
 */
router.post('/empresas/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resultado = await saasAdminService.resetearPasswordAdmin(id, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al resetear password:', error);
    res.status(400).json({ error: error.message || 'Error al resetear password' });
  }
});

/**
 * POST /api/admin/empresas/:id/cambiar-email
 * Cambiar email del admin principal
 */
router.post('/empresas/:id/cambiar-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nuevoEmail } = req.body;

    if (!nuevoEmail) {
      return res.status(400).json({ error: 'nuevoEmail es requerido' });
    }

    const resultado = await saasAdminService.cambiarEmailAdmin(id, nuevoEmail, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al cambiar email:', error);
    res.status(400).json({ error: error.message || 'Error al cambiar email' });
  }
});

/**
 * POST /api/admin/empresas/:id/toggle-bloqueo
 * Bloquear/desbloquear admin principal
 */
router.post('/empresas/:id/toggle-bloqueo', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bloquear } = req.body;

    if (typeof bloquear !== 'boolean') {
      return res.status(400).json({ error: 'bloquear debe ser true o false' });
    }

    const resultado = await saasAdminService.toggleBloqueoAdmin(id, bloquear, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al cambiar bloqueo:', error);
    res.status(400).json({ error: error.message || 'Error al cambiar bloqueo' });
  }
});

/**
 * POST /api/admin/empresas/:id/cerrar-sesiones
 * Forzar cierre de todas las sesiones de una empresa
 */
router.post('/empresas/:id/cerrar-sesiones', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resultado = await saasAdminService.forzarCierreSesiones(id, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al cerrar sesiones:', error);
    res.status(400).json({ error: error.message || 'Error al cerrar sesiones' });
  }
});

/**
 * GET /api/admin/empresas/:id/auditoria
 * Obtener auditoría de una empresa
 */
router.get('/empresas/:id/auditoria', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 50;
    const auditoria = await saasAdminService.obtenerAuditoriaEmpresa(id, limite);
    res.json(auditoria);
  } catch (error: any) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

/**
 * POST /api/admin/empresas/:id/cambiar-plan
 * Cambiar plan de una empresa
 */
router.post('/empresas/:id/cambiar-plan', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nuevoPlan, motivo } = req.body;

    if (!nuevoPlan || !['basico', 'profesional', 'enterprise'].includes(nuevoPlan)) {
      return res.status(400).json({ 
        error: 'nuevoPlan debe ser: basico, profesional o enterprise' 
      });
    }

    const resultado = await saasAdminService.cambiarPlan(
      { empresaId: id, nuevoPlan: nuevoPlan as PlanType, motivo },
      {
        id: req.superAdminContext!.userId,
        email: req.superAdminContext!.email
      }
    );
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al cambiar plan:', error);
    res.status(400).json({ error: error.message || 'Error al cambiar plan' });
  }
});

// ============================================
// ENDPOINTS DE LICENCIAS AVANZADOS
// ============================================

/**
 * POST /api/admin/licencias/:id/extender
 * Extender licencia manualmente
 */
router.post('/licencias/:id/extender', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dias, motivo } = req.body;

    if (!dias || dias < 1) {
      return res.status(400).json({ error: 'dias debe ser mayor a 0' });
    }

    const resultado = await saasAdminService.extenderLicencia(
      { licenciaId: id, dias: parseInt(dias, 10), motivo },
      {
        id: req.superAdminContext!.userId,
        email: req.superAdminContext!.email
      }
    );
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al extender licencia:', error);
    res.status(400).json({ error: error.message || 'Error al extender licencia' });
  }
});

/**
 * POST /api/admin/licencias/:id/pausar
 * Pausar licencia
 */
router.post('/licencias/:id/pausar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'motivo es requerido' });
    }

    const resultado = await saasAdminService.pausarLicencia(id, motivo, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al pausar licencia:', error);
    res.status(400).json({ error: error.message || 'Error al pausar licencia' });
  }
});

/**
 * POST /api/admin/licencias/:id/reanudar
 * Reanudar licencia pausada
 */
router.post('/licencias/:id/reanudar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resultado = await saasAdminService.reanudarLicencia(id, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al reanudar licencia:', error);
    res.status(400).json({ error: error.message || 'Error al reanudar licencia' });
  }
});

// ============================================
// AUDITORÍA GLOBAL
// ============================================

/**
 * GET /api/admin/auditoria
 * Obtener auditoría global del sistema
 */
router.get('/auditoria', async (req: Request, res: Response) => {
  try {
    const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 100;
    const auditoria = await saasAdminService.obtenerAuditoriaGlobal(limite);
    res.json(auditoria);
  } catch (error: any) {
    console.error('Error al obtener auditoría global:', error);
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

// ============================================
// ELIMINACIÓN SEGURA DE EMPRESA (SOFT DELETE)
// ============================================

/**
 * POST /api/admin/empresas/:id/eliminar
 * Eliminar empresa de forma segura (soft delete)
 * 
 * ⚠️ ACCIÓN CRÍTICA - Requiere:
 * - Revalidación de contraseña del super admin
 * - Confirmación textual exacta: "ELIMINAR <NOMBRE_EMPRESA>"
 * - Motivo obligatorio
 * 
 * NO elimina datos físicamente, solo marca como eliminada
 */
router.post('/empresas/:id/eliminar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo, motivoDetalle, confirmacionTexto, passwordAdmin } = req.body;

    // Validaciones de entrada
    if (!confirmacionTexto || typeof confirmacionTexto !== 'string') {
      return res.status(400).json({ 
        error: 'Confirmación de texto requerida',
        formato: 'ELIMINAR <NOMBRE_EMPRESA>'
      });
    }

    if (!passwordAdmin || typeof passwordAdmin !== 'string') {
      return res.status(400).json({ 
        error: 'Contraseña del administrador requerida para esta acción' 
      });
    }

    if (!motivo || typeof motivo !== 'string') {
      return res.status(400).json({ 
        error: 'Motivo de eliminación requerido',
        motivos_validos: [
          'solicitud_cliente',
          'incumplimiento_pago',
          'violacion_terminos',
          'fraude_detectado',
          'empresa_duplicada',
          'cierre_negocio',
          'otro'
        ]
      });
    }

    // Obtener info de la petición para auditoría
    const requestInfo = {
      ip: req.ip || req.socket.remoteAddress || 'desconocida',
      userAgent: req.get('User-Agent') || 'desconocido'
    };

    const resultado = await saasAdminService.eliminarEmpresa(
      {
        empresaId: id,
        motivo: motivo as any,
        motivoDetalle,
        confirmacionTexto,
        passwordAdmin
      },
      {
        id: req.superAdminContext!.userId,
        email: req.superAdminContext!.email
      },
      requestInfo
    );

    // Log crítico
    console.log(`[ADMIN CRÍTICO] Empresa ${id} eliminada por ${req.superAdminContext?.email} desde IP: ${requestInfo.ip}`);

    res.json(resultado);
  } catch (error: any) {
    console.error('Error al eliminar empresa:', error);
    
    // Determinar código de error apropiado
    if (error.message.includes('Contraseña incorrecta')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Confirmación incorrecta')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('ya ha sido eliminada')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(400).json({ error: error.message || 'Error al eliminar empresa' });
  }
});

/**
 * GET /api/admin/empresas-eliminadas
 * Listar empresas eliminadas (solo visible en Panel Admin SaaS)
 */
router.get('/empresas-eliminadas', async (req: Request, res: Response) => {
  try {
    const empresas = await saasAdminService.listarEmpresasEliminadas();
    res.json(empresas);
  } catch (error: any) {
    console.error('Error al listar empresas eliminadas:', error);
    res.status(500).json({ error: 'Error al listar empresas eliminadas' });
  }
});

// ============================================
// CONFIGURACIÓN DE PLANES
// ============================================

/**
 * GET /api/admin/planes
 * Obtener configuración de todos los planes
 */
router.get('/planes', async (req: Request, res: Response) => {
  try {
    const planes = saasAdminService.obtenerConfiguracionPlanes();
    res.json(planes);
  } catch (error: any) {
    console.error('Error al obtener planes:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

/**
 * PUT /api/admin/planes/:planId
 * Actualizar configuración de un plan
 */
router.put('/planes/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { precio_anual, max_usuarios, max_mesas, duracion_dias, descripcion, activo } = req.body;
    
    const resultado = await saasAdminService.actualizarConfiguracionPlan(planId as PlanType, {
      precio_anual,
      max_usuarios,
      max_mesas,
      duracion_dias,
      descripcion,
      activo
    }, {
      id: req.superAdminContext!.userId,
      email: req.superAdminContext!.email
    });
    
    res.json(resultado);
  } catch (error: any) {
    console.error('Error al actualizar plan:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar plan' });
  }
});

// ============================================
// IMPERSONACIÓN SEGURA (MODO SOPORTE)
// ============================================

import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';
const IMPERSONATION_EXPIRY = '30m'; // Sesión de impersonación: 30 minutos

/**
 * POST /api/admin/impersonar
 * Iniciar sesión de impersonación como usuario de empresa cliente
 * 
 * ⚠️ Solo Super Admin puede usar este endpoint
 * ⚠️ Genera token temporal con flag impersonated = true
 * ⚠️ Toda acción queda registrada en auditoría
 */
router.post('/impersonar', async (req: Request, res: Response) => {
  try {
    const { empresaId, usuarioId } = req.body;
    const superAdminId = req.superAdminContext!.userId;
    const superAdminEmail = req.superAdminContext!.email;

    // Validaciones de entrada
    if (!empresaId || !usuarioId) {
      return res.status(400).json({ 
        error: 'empresaId y usuarioId son requeridos' 
      });
    }

    // 1. Verificar que la empresa existe y está activa
    const empresa = await db
      .selectFrom('empresas')
      .select(['id', 'nombre', 'estado', 'deleted_at'])
      .where('id', '=', empresaId)
      .executeTakeFirst();

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    if (empresa.deleted_at) {
      return res.status(403).json({ 
        error: 'No se puede impersonar en una empresa eliminada' 
      });
    }

    // 2. Verificar que el usuario existe, está activo y pertenece a la empresa
    const usuario = await db
      .selectFrom('usuarios')
      .leftJoin('roles', 'roles.id', 'usuarios.rol_id')
      .select([
        'usuarios.id',
        'usuarios.nombre',
        'usuarios.email',
        'usuarios.activo',
        'usuarios.empresa_id',
        'usuarios.rol_id',
        'usuarios.is_super_admin',
        'roles.nombre as rol_nombre'
      ])
      .where('usuarios.id', '=', usuarioId)
      .executeTakeFirst();

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.empresa_id !== empresaId) {
      return res.status(403).json({ 
        error: 'El usuario no pertenece a la empresa indicada' 
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({ 
        error: 'No se puede impersonar a un usuario desactivado' 
      });
    }

    if (usuario.is_super_admin) {
      return res.status(403).json({ 
        error: 'No se puede impersonar a otro Super Admin' 
      });
    }

    // 3. Verificar licencia de la empresa (permitir en modo soporte aunque esté expirada)
    const licencia = await db
      .selectFrom('licencias')
      .select(['id', 'estado', 'plan'])
      .where('empresa_id', '=', empresaId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    // 4. Obtener permisos del rol del usuario
    const permisosData = await db
      .selectFrom('permisos_rol')
      .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
      .select('permisos.clave')
      .where('permisos_rol.rol_id', '=', usuario.rol_id || '')
      .where('permisos_rol.empresa_id', '=', empresaId)
      .execute();
    
    const permisosList = permisosData.map(p => p.clave);

    // 5. Generar token de impersonación con TTL reducido
    const impersonationPayload = {
      userId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      empresaId: empresaId,
      rolId: usuario.rol_id,
      rol: usuario.rol_nombre || 'Usuario',
      permisos: permisosList,
      impersonated: true,
      originalAdminId: superAdminId,
      originalAdminEmail: superAdminEmail
    };

    const impersonationToken = jwt.sign(impersonationPayload, JWT_SECRET, { 
      expiresIn: IMPERSONATION_EXPIRY 
    });

    // 6. Registrar en auditoría de impersonación
    const requestInfo = {
      ip: req.ip || req.socket.remoteAddress || 'desconocida',
      userAgent: req.get('User-Agent') || 'desconocido'
    };

    await (db.insertInto('auditoria_impersonacion' as any) as any)
      .values({
        empresa_id: empresaId,
        usuario_impersonado_id: usuarioId,
        super_admin_id: superAdminId,
        tipo_evento: 'INICIADA',
        ip_address: requestInfo.ip,
        user_agent: requestInfo.userAgent,
        metadata: JSON.stringify({
          empresa_nombre: empresa.nombre,
          usuario_nombre: usuario.nombre,
          usuario_email: usuario.email,
          rol_impersonado: usuario.rol_nombre,
          licencia_estado: licencia?.estado || 'sin_licencia'
        })
      })
      .execute();

    // 7. Log de seguridad
    console.log(`[IMPERSONACIÓN] Super Admin ${superAdminEmail} inició impersonación como ${usuario.email} en empresa ${empresa.nombre} desde IP: ${requestInfo.ip}`);

    res.json({
      success: true,
      token: impersonationToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_nombre
      },
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre
      },
      impersonacion: {
        expira_en: IMPERSONATION_EXPIRY,
        originalAdminId: superAdminId
      },
      mensaje: 'Sesión de impersonación iniciada. Recuerda salir del modo soporte cuando termines.'
    });

  } catch (error: any) {
    console.error('Error en impersonación:', error);
    res.status(500).json({ error: 'Error al iniciar impersonación' });
  }
});

/**
 * POST /api/admin/impersonar/salir
 * Finalizar sesión de impersonación y regresar al token de Super Admin
 * 
 * Este endpoint puede ser llamado tanto desde el panel de la empresa
 * como desde el panel admin. El token actual se invalida.
 */
router.post('/impersonar/salir', async (req: Request, res: Response) => {
  try {
    // Verificar que hay token de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    
    // Decodificar token (aunque sea de impersonación)
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Si es un token de impersonación, registrar finalización
    if (decoded.impersonated && decoded.originalAdminId) {
      // Registrar fin de impersonación
      await (db.insertInto('auditoria_impersonacion' as any) as any)
        .values({
          empresa_id: decoded.empresaId,
          usuario_impersonado_id: decoded.userId,
          super_admin_id: decoded.originalAdminId,
          tipo_evento: 'FINALIZADA',
          ip_address: req.ip || req.socket.remoteAddress || 'desconocida',
          user_agent: req.get('User-Agent') || 'desconocido',
          fecha_fin: new Date(),
          metadata: JSON.stringify({
            finalizado_por: 'usuario',
            token_original_admin: decoded.originalAdminEmail
          })
        })
        .execute();

      console.log(`[IMPERSONACIÓN] Sesión finalizada: Admin ${decoded.originalAdminEmail} dejó de impersonar usuario ${decoded.userId}`);

      return res.json({
        success: true,
        mensaje: 'Sesión de impersonación finalizada correctamente',
        redirigir_a: '/dashboard' // Volver al panel admin
      });
    }

    // Si no es token de impersonación, simplemente confirmar
    res.json({
      success: true,
      mensaje: 'No había sesión de impersonación activa'
    });

  } catch (error: any) {
    console.error('Error al salir de impersonación:', error);
    res.status(500).json({ error: 'Error al finalizar impersonación' });
  }
});

/**
 * GET /api/admin/impersonaciones
 * Obtener historial de impersonaciones realizadas
 */
router.get('/impersonaciones', async (req: Request, res: Response) => {
  try {
    const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 50;
    const empresaId = req.query.empresaId as string | undefined;

    let query = (db.selectFrom('auditoria_impersonacion' as any) as any)
      .leftJoin('empresas', 'empresas.id', 'auditoria_impersonacion.empresa_id')
      .leftJoin('usuarios as usuario_impersonado', 'usuario_impersonado.id', 'auditoria_impersonacion.usuario_impersonado_id')
      .leftJoin('usuarios as super_admin', 'super_admin.id', 'auditoria_impersonacion.super_admin_id')
      .select([
        'auditoria_impersonacion.id',
        'auditoria_impersonacion.tipo_evento',
        'auditoria_impersonacion.ip_address',
        'auditoria_impersonacion.fecha_inicio',
        'auditoria_impersonacion.fecha_fin',
        'auditoria_impersonacion.metadata',
        'empresas.nombre as empresa_nombre',
        'usuario_impersonado.nombre as usuario_nombre',
        'usuario_impersonado.email as usuario_email',
        'super_admin.nombre as admin_nombre',
        'super_admin.email as admin_email'
      ])
      .orderBy('auditoria_impersonacion.fecha_inicio', 'desc')
      .limit(limite);

    if (empresaId) {
      query = query.where('auditoria_impersonacion.empresa_id', '=', empresaId);
    }

    const impersonaciones = await query.execute();

    res.json(impersonaciones);
  } catch (error: any) {
    console.error('Error al obtener historial de impersonaciones:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

export default router;
