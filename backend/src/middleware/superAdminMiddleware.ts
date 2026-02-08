/**
 * Middleware de Autenticación para Super Admin SaaS
 * FASE 2.2 - Consolidación SaaS
 * 
 * Este middleware es DIFERENTE al middleware de autenticación normal.
 * Solo permite acceso a usuarios con is_super_admin = true
 * 
 * ❌ NO tiene empresa_id
 * ❌ NO accede al sistema de comandas
 * ✅ Solo rutas /api/admin/*
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/database';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';

export interface SuperAdminContext {
  userId: string;
  nombre: string;
  email: string;
  isSuperAdmin: true;
}

// Extender Request para super admin context
declare global {
  namespace Express {
    interface Request {
      superAdminContext?: SuperAdminContext;
    }
  }
}

/**
 * Middleware para verificar que el usuario sea un Super Admin SaaS
 */
export const verificarSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No se proporcionó token de autenticación' });
      return;
    }

    const token = authHeader.substring(7);

    // Verificar JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    const { userId } = decoded;

    // Verificar que el usuario sea super admin
    const usuario = await db
      .selectFrom('usuarios')
      .select(['id', 'nombre', 'email', 'is_super_admin', 'activo'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!usuario) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({ error: 'Usuario desactivado' });
      return;
    }

    if (!usuario.is_super_admin) {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Administrador.' });
      return;
    }

    // Inyectar contexto de super admin
    req.superAdminContext = {
      userId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      isSuperAdmin: true
    };

    next();
  } catch (error) {
    console.error('Error en superAdminMiddleware:', error);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

/**
 * Servicio para autenticación de super admin
 */
export class SuperAdminAuthService {
  /**
   * Login específico para super admin
   * Usa el mismo endpoint pero valida is_super_admin
   */
  async login(email: string, password: string) {
    const bcrypt = await import('bcrypt');

    const usuario = await db
      .selectFrom('usuarios')
      .selectAll()
      .where('email', '=', email.toLowerCase().trim())
      .where('is_super_admin', '=', true)
      .executeTakeFirst();

    if (!usuario) {
      throw new Error('Credenciales inválidas o usuario no es Super Admin');
    }

    if (!usuario.activo) {
      throw new Error('Usuario desactivado');
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordMatch) {
      throw new Error('Credenciales inválidas');
    }

    const payload = {
      userId: usuario.id,
      isSuperAdmin: true
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        isSuperAdmin: true
      }
    };
  }

  /**
   * Crear el primer super admin del sistema
   * Solo se puede ejecutar si no existe ningún super admin
   */
  async crearPrimerSuperAdmin(nombre: string, email: string, password: string) {
    const bcrypt = await import('bcrypt');
    const { v4: uuidv4 } = await import('uuid');

    // Verificar que no exista ningún super admin
    const existeSuperAdmin = await db
      .selectFrom('usuarios')
      .select('id')
      .where('is_super_admin', '=', true)
      .executeTakeFirst();

    if (existeSuperAdmin) {
      throw new Error('Ya existe un Super Admin en el sistema. Use el Panel Admin para crear más.');
    }

    // Verificar email único
    const emailExiste = await db
      .selectFrom('usuarios')
      .select('id')
      .where('email', '=', email.toLowerCase().trim())
      .executeTakeFirst();

    if (emailExiste) {
      throw new Error('El email ya está en uso');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // El super admin necesita un empresa_id técnico (puede ser nulo o especial)
    // Por simplicidad, usamos un UUID especial para "sistema"
    const SISTEMA_EMPRESA_ID = '00000000-0000-0000-0000-000000000000';

    // Verificar si existe la empresa "Sistema"
    const empresaSistema = await db
      .selectFrom('empresas')
      .select('id')
      .where('id', '=', SISTEMA_EMPRESA_ID)
      .executeTakeFirst();

    if (!empresaSistema) {
      // Crear empresa especial del sistema
      await db
        .insertInto('empresas')
        .values({
          id: SISTEMA_EMPRESA_ID,
          nombre: 'Sistema SaaS',
          slug: 'sistema-saas',
          estado: 'activo',
          origen: 'manual'
        } as any)
        .execute();
    }

    // Crear super admin
    // Generar nombre de usuario a partir del email (antes del @)
    const usuarioNombre = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    await db
      .insertInto('usuarios')
      .values({
        id: userId,
        empresa_id: SISTEMA_EMPRESA_ID,
        nombre: nombre.trim(),
        usuario: usuarioNombre,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        activo: true,
        is_super_admin: true
      } as any)
      .execute();

    return {
      id: userId,
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      isSuperAdmin: true
    };
  }
}
