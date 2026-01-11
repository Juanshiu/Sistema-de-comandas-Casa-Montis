import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../database/init';
import { LoginRequest, LoginResponse, UsuarioSesion } from '../models';

const router = express.Router();

// Duración de la sesión: 12 horas
const SESSION_DURATION_HOURS = 12;

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usuario, password }: LoginRequest = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario en la base de datos
    db.get(`
      SELECT 
        u.id,
        u.usuario,
        u.password_hash,
        u.nombre_completo,
        u.rol_id,
        u.activo,
        r.nombre as rol_nombre,
        r.es_superusuario
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = ?
    `, [usuario], async (err, row: any) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      // Verificar que el usuario esté activo
      if (!row.activo) {
        return res.status(403).json({ error: 'Usuario desactivado. Contacta al administrador' });
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, row.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      // Generar token único
      const token = crypto.randomBytes(32).toString('hex');

      // Calcular fecha de expiración
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + SESSION_DURATION_HOURS);

      // Crear sesión en la base de datos
      db.run(`
        INSERT INTO sesiones (usuario_id, token, fecha_expiracion, activo)
        VALUES (?, ?, ?, 1)
      `, [row.id, token, fechaExpiracion.toISOString()], function(err) {
        if (err) {
          console.error('Error al crear sesión:', err);
          return res.status(500).json({ error: 'Error al crear sesión' });
        }

        // Actualizar último login
        db.run(`
          UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?
        `, [row.id]);

        // Obtener permisos del rol
        db.all(`
          SELECT permiso
          FROM permisos_rol
          WHERE rol_id = ? AND activo = 1
        `, [row.rol_id], (err, permisos: any[]) => {
          if (err) {
            console.error('Error al obtener permisos:', err);
            return res.status(500).json({ error: 'Error al obtener permisos' });
          }

          const usuario: UsuarioSesion = {
            id: row.id,
            usuario: row.usuario,
            nombre_completo: row.nombre_completo,
            rol_id: row.rol_id,
            rol_nombre: row.rol_nombre,
            es_superusuario: row.es_superusuario
          };

          const response: LoginResponse = {
            token,
            usuario,
            permisos: permisos.map(p => p.permiso)
          };

          console.log(`✅ Login exitoso: ${row.nombre_completo} (${row.usuario})`);
          res.json(response);
        });
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);

    // Desactivar la sesión
    db.run(`
      UPDATE sesiones SET activo = 0 WHERE token = ?
    `, [token], function(err) {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }

      console.log('✅ Sesión cerrada exitosamente');
      res.json({ mensaje: 'Sesión cerrada exitosamente' });
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/auth/session
 * Validar sesión activa y obtener datos del usuario
 */
router.get('/session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);

    // Verificar sesión
    db.get(`
      SELECT 
        s.usuario_id,
        s.fecha_expiracion,
        u.id,
        u.usuario,
        u.nombre_completo,
        u.rol_id,
        u.activo,
        r.nombre as rol_nombre,
        r.es_superusuario
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE s.token = ? AND s.activo = 1
    `, [token], (err, row: any) => {
      if (err) {
        console.error('Error al validar sesión:', err);
        return res.status(500).json({ error: 'Error al validar sesión' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Sesión inválida' });
      }

      // Verificar expiración
      const fechaExpiracion = new Date(row.fecha_expiracion);
      if (fechaExpiracion < new Date()) {
        return res.status(401).json({ error: 'Sesión expirada' });
      }

      if (!row.activo) {
        return res.status(403).json({ error: 'Usuario desactivado' });
      }

      // Obtener permisos
      db.all(`
        SELECT permiso
        FROM permisos_rol
        WHERE rol_id = ? AND activo = 1
      `, [row.rol_id], (err, permisos: any[]) => {
        if (err) {
          console.error('Error al obtener permisos:', err);
          return res.status(500).json({ error: 'Error al obtener permisos' });
        }

        const usuario: UsuarioSesion = {
          id: row.id,
          usuario: row.usuario,
          nombre_completo: row.nombre_completo,
          rol_id: row.rol_id,
          rol_nombre: row.rol_nombre,
          es_superusuario: row.es_superusuario
        };

        res.json({
          usuario,
          permisos: permisos.map(p => p.permiso)
        });
      });
    });
  } catch (error) {
    console.error('Error al validar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/auth/change-password
 * Cambiar contraseña del usuario autenticado
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ error: 'Se requiere contraseña actual y nueva' });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener usuario de la sesión
    db.get(`
      SELECT u.id, u.password_hash
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.token = ? AND s.activo = 1
    `, [token], async (err, row: any) => {
      if (err || !row) {
        return res.status(401).json({ error: 'Sesión inválida' });
      }

      // Verificar contraseña actual
      const passwordMatch = await bcrypt.compare(password_actual, row.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      // Hashear nueva contraseña
      const nuevoHash = await bcrypt.hash(password_nueva, 10);

      // Actualizar contraseña
      db.run(`
        UPDATE usuarios SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [nuevoHash, row.id], (err) => {
        if (err) {
          console.error('Error al cambiar contraseña:', err);
          return res.status(500).json({ error: 'Error al cambiar contraseña' });
        }

        console.log(`✅ Contraseña cambiada para usuario ID: ${row.id}`);
        res.json({ mensaje: 'Contraseña actualizada exitosamente' });
      });
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
