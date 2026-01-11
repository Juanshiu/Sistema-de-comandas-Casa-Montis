import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../database/init';
import { verificarAutenticacion, verificarSuperUsuario } from '../middleware/authMiddleware';
import { Usuario } from '../models';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verificarAutenticacion);

/**
 * GET /api/usuarios
 * Listar todos los usuarios (solo superusuarios)
 */
router.get('/', verificarSuperUsuario, (req: Request, res: Response) => {
  db.all(`
    SELECT 
      u.id,
      u.usuario,
      u.nombre_completo,
      u.rol_id,
      u.pin,
      u.telefono,
      u.activo,
      u.ultimo_login,
      u.created_at,
      r.nombre as rol_nombre
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    ORDER BY u.nombre_completo
  `, [], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }

    res.json(rows);
  });
});

/**
 * GET /api/usuarios/:id
 * Obtener un usuario específico
 */
router.get('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT 
      u.id,
      u.usuario,
      u.nombre_completo,
      u.rol_id,
      u.pin,
      u.telefono,
      u.activo,
      u.ultimo_login,
      u.created_at,
      r.nombre as rol_nombre
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.id = ?
  `, [id], (err, row: any) => {
    if (err) {
      console.error('Error al obtener usuario:', err);
      return res.status(500).json({ error: 'Error al obtener usuario' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(row);
  });
});

/**
 * POST /api/usuarios
 * Crear un nuevo usuario (solo superusuarios)
 */
router.post('/', verificarSuperUsuario, async (req: Request, res: Response) => {
  try {
    const { usuario, password, nombre_completo, rol_id, pin, telefono, activo } = req.body;

    // Validaciones
    if (!usuario || !password || !nombre_completo || !rol_id) {
      return res.status(400).json({ 
        error: 'Campos requeridos: usuario, password, nombre_completo, rol_id' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar que el usuario no exista
    db.get('SELECT id FROM usuarios WHERE usuario = ?', [usuario], async (err, row) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ error: 'Error al verificar usuario' });
      }

      if (row) {
        return res.status(400).json({ error: 'El usuario ya existe' });
      }

      // Verificar que el rol existe
      db.get('SELECT id FROM roles WHERE id = ? AND activo = 1', [rol_id], async (err, rol) => {
        if (err || !rol) {
          return res.status(400).json({ error: 'Rol inválido' });
        }

        // Hashear contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        db.run(`
          INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol_id, pin, telefono, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          usuario,
          passwordHash,
          nombre_completo,
          rol_id,
          pin || null,
          telefono || null,
          activo !== undefined ? activo : true
        ], function(err) {
          if (err) {
            console.error('Error al crear usuario:', err);
            return res.status(500).json({ error: 'Error al crear usuario' });
          }

          console.log(`✅ Usuario creado: ${nombre_completo} (ID: ${this.lastID})`);
          res.status(201).json({ 
            id: this.lastID,
            mensaje: 'Usuario creado exitosamente' 
          });
        });
      });
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar un usuario (solo superusuarios)
 */
router.put('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;
  const { usuario, nombre_completo, rol_id, pin, telefono, activo } = req.body;

  // Validaciones básicas
  if (!nombre_completo || !rol_id) {
    return res.status(400).json({ error: 'Campos requeridos: nombre_completo, rol_id' });
  }

  // Verificar que el usuario existe
  db.get('SELECT id FROM usuarios WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error al verificar usuario:', err);
      return res.status(500).json({ error: 'Error al verificar usuario' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el rol existe
    db.get('SELECT id FROM roles WHERE id = ? AND activo = 1', [rol_id], (err, rol) => {
      if (err || !rol) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // Actualizar usuario
      db.run(`
        UPDATE usuarios 
        SET 
          usuario = COALESCE(?, usuario),
          nombre_completo = ?,
          rol_id = ?,
          pin = ?,
          telefono = ?,
          activo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        usuario || null,
        nombre_completo,
        rol_id,
        pin || null,
        telefono || null,
        activo !== undefined ? activo : true,
        id
      ], function(err) {
        if (err) {
          console.error('Error al actualizar usuario:', err);
          return res.status(500).json({ error: 'Error al actualizar usuario' });
        }

        console.log(`✅ Usuario actualizado: ID ${id}`);
        res.json({ mensaje: 'Usuario actualizado exitosamente' });
      });
    });
  });
});

/**
 * DELETE /api/usuarios/:id
 * Desactivar usuario (soft delete) (solo superusuarios)
 */
router.delete('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;

  // No permitir desactivar al propio usuario
  if (req.usuario && req.usuario.id === parseInt(id)) {
    return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
  }

  db.run(`
    UPDATE usuarios SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [id], function(err) {
    if (err) {
      console.error('Error al desactivar usuario:', err);
      return res.status(500).json({ error: 'Error al desactivar usuario' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Desactivar sesiones activas del usuario
    db.run('UPDATE sesiones SET activo = 0 WHERE usuario_id = ?', [id]);

    console.log(`✅ Usuario desactivado: ID ${id}`);
    res.json({ mensaje: 'Usuario desactivado exitosamente' });
  });
});

/**
 * PUT /api/usuarios/:id/reset-password
 * Resetear contraseña de un usuario (solo superusuarios)
 */
router.put('/:id/reset-password', verificarSuperUsuario, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nueva_password } = req.body;

    if (!nueva_password) {
      return res.status(400).json({ error: 'Se requiere nueva_password' });
    }

    if (nueva_password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(nueva_password, 10);

    db.run(`
      UPDATE usuarios 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [passwordHash, id], function(err) {
      if (err) {
        console.error('Error al resetear contraseña:', err);
        return res.status(500).json({ error: 'Error al resetear contraseña' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log(`✅ Contraseña reseteada para usuario ID: ${id}`);
      res.json({ mensaje: 'Contraseña reseteada exitosamente' });
    });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
