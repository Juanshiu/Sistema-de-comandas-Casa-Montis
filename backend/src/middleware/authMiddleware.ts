import { Request, Response, NextFunction } from 'express';
import { db } from '../database/init';
import { Usuario, UsuarioSesion } from '../models';

// Extender el tipo Request de Express para incluir usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}

/**
 * Middleware para verificar que el usuario esté autenticado
 * Valida el token en el header Authorization y verifica que la sesión esté activa
 */
export const verificarAutenticacion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No se proporcionó token de autenticación' });
      return;
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar que el token existe y está activo
    db.get(`
      SELECT 
        s.id as sesion_id,
        s.usuario_id,
        s.fecha_expiracion,
        s.activo as sesion_activa,
        u.id,
        u.usuario,
        u.nombre_completo,
        u.rol_id,
        u.activo as usuario_activo,
        r.nombre as rol_nombre,
        r.es_superusuario
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE s.token = ? AND s.activo = 1
    `, [token], (err, row: any) => {
      if (err) {
        console.error('Error al verificar token:', err);
        res.status(500).json({ error: 'Error al verificar autenticación' });
        return;
      }

      if (!row) {
        res.status(401).json({ error: 'Token inválido o expirado' });
        return;
      }

      // Verificar que la sesión no haya expirado
      const fechaExpiracion = new Date(row.fecha_expiracion);
      if (fechaExpiracion < new Date()) {
        // Desactivar sesión expirada
        db.run('UPDATE sesiones SET activo = 0 WHERE id = ?', [row.sesion_id]);
        res.status(401).json({ error: 'Sesión expirada' });
        return;
      }

      // Verificar que el usuario esté activo
      if (!row.usuario_activo) {
        res.status(403).json({ error: 'Usuario desactivado' });
        return;
      }

      // Agregar información del usuario al request
      req.usuario = {
        id: row.id,
        usuario: row.usuario,
        nombre_completo: row.nombre_completo,
        rol_id: row.rol_id,
        rol_nombre: row.rol_nombre,
        es_superusuario: row.es_superusuario
      };

      next();
    });
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Middleware para verificar que el usuario tenga un permiso específico
 */
export const verificarPermiso = (permisoRequerido: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      // Los superusuarios tienen todos los permisos
      if (req.usuario.es_superusuario) {
        next();
        return;
      }

      // Verificar si el rol del usuario tiene el permiso requerido
      db.get(`
        SELECT id
        FROM permisos_rol
        WHERE rol_id = ? AND permiso = ? AND activo = 1
      `, [req.usuario.rol_id, permisoRequerido], (err, row) => {
        if (err) {
          console.error('Error al verificar permiso:', err);
          res.status(500).json({ error: 'Error al verificar permisos' });
          return;
        }

        if (!row) {
          res.status(403).json({ 
            error: 'No tienes permiso para realizar esta acción',
            permiso_requerido: permisoRequerido
          });
          return;
        }

        next();
      });
    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

/**
 * Middleware para verificar que el usuario sea superusuario
 */
export const verificarSuperUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!req.usuario.es_superusuario) {
      res.status(403).json({ error: 'Acceso restringido a superusuarios' });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en middleware de superusuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
