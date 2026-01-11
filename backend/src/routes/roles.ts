import express, { Request, Response } from 'express';
import { db } from '../database/init';
import { verificarAutenticacion, verificarSuperUsuario } from '../middleware/authMiddleware';
import { Rol, PermisoRol } from '../models';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verificarAutenticacion);

/**
 * GET /api/roles
 * Listar todos los roles (solo superusuarios)
 */
router.get('/', verificarSuperUsuario, (req: Request, res: Response) => {
  db.all(`
    SELECT 
      r.id,
      r.nombre,
      r.descripcion,
      r.es_superusuario,
      r.activo,
      r.created_at,
      COUNT(DISTINCT u.id) as cantidad_usuarios
    FROM roles r
    LEFT JOIN usuarios u ON r.id = u.rol_id AND u.activo = 1
    GROUP BY r.id
    ORDER BY r.nombre
  `, [], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener roles:', err);
      return res.status(500).json({ error: 'Error al obtener roles' });
    }

    res.json(rows);
  });
});

/**
 * GET /api/roles/:id
 * Obtener un rol específico con sus permisos
 */
router.get('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;

  db.get(`
    SELECT 
      r.id,
      r.nombre,
      r.descripcion,
      r.es_superusuario,
      r.activo,
      r.created_at,
      COUNT(DISTINCT u.id) as cantidad_usuarios
    FROM roles r
    LEFT JOIN usuarios u ON r.id = u.rol_id AND u.activo = 1
    WHERE r.id = ?
    GROUP BY r.id
  `, [id], (err, rol: any) => {
    if (err) {
      console.error('Error al obtener rol:', err);
      return res.status(500).json({ error: 'Error al obtener rol' });
    }

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Obtener permisos del rol
    db.all(`
      SELECT id, permiso, activo
      FROM permisos_rol
      WHERE rol_id = ?
    `, [id], (err, permisos: any[]) => {
      if (err) {
        console.error('Error al obtener permisos:', err);
        return res.status(500).json({ error: 'Error al obtener permisos' });
      }

      res.json({
        ...rol,
        permisos
      });
    });
  });
});

/**
 * POST /api/roles
 * Crear un nuevo rol con permisos (solo superusuarios)
 */
router.post('/', verificarSuperUsuario, (req: Request, res: Response) => {
  const { nombre, descripcion, es_superusuario, permisos, activo } = req.body;

  // Validaciones
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del rol es requerido' });
  }

  // Verificar que el rol no exista
  db.get('SELECT id FROM roles WHERE nombre = ?', [nombre], (err, row) => {
    if (err) {
      console.error('Error al verificar rol:', err);
      return res.status(500).json({ error: 'Error al verificar rol' });
    }

    if (row) {
      return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
    }

    // Crear rol
    db.run(`
      INSERT INTO roles (nombre, descripcion, es_superusuario, activo)
      VALUES (?, ?, ?, ?)
    `, [
      nombre,
      descripcion || null,
      es_superusuario || false,
      activo !== undefined ? activo : true
    ], function(err) {
      if (err) {
        console.error('Error al crear rol:', err);
        return res.status(500).json({ error: 'Error al crear rol' });
      }

      const rolId = this.lastID;

      // Si se proporcionaron permisos, agregarlos
      if (permisos && Array.isArray(permisos) && permisos.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO permisos_rol (rol_id, permiso, activo) VALUES (?, ?, 1)
        `);

        permisos.forEach((permiso: string) => {
          stmt.run([rolId, permiso]);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('Error al agregar permisos:', err);
          }
        });
      }

      console.log(`✅ Rol creado: ${nombre} (ID: ${rolId})`);
      res.status(201).json({ 
        id: rolId,
        mensaje: 'Rol creado exitosamente' 
      });
    });
  });
});

/**
 * PUT /api/roles/:id
 * Actualizar un rol y sus permisos (solo superusuarios)
 */
router.put('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, es_superusuario, permisos, activo } = req.body;

  // Validación básica
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del rol es requerido' });
  }

  // Verificar que el rol existe
  db.get('SELECT id FROM roles WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error al verificar rol:', err);
      return res.status(500).json({ error: 'Error al verificar rol' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Actualizar rol
    db.run(`
      UPDATE roles 
      SET 
        nombre = ?,
        descripcion = ?,
        es_superusuario = ?,
        activo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      nombre,
      descripcion || null,
      es_superusuario || false,
      activo !== undefined ? activo : true,
      id
    ], function(err) {
      if (err) {
        console.error('Error al actualizar rol:', err);
        return res.status(500).json({ error: 'Error al actualizar rol' });
      }

      // Si se proporcionaron permisos, actualizarlos
      if (permisos && Array.isArray(permisos)) {
        // Primero, eliminar todos los permisos existentes
        db.run('DELETE FROM permisos_rol WHERE rol_id = ?', [id], (err) => {
          if (err) {
            console.error('Error al eliminar permisos anteriores:', err);
          }

          // Luego, agregar los nuevos permisos
          if (permisos.length > 0) {
            const stmt = db.prepare(`
              INSERT INTO permisos_rol (rol_id, permiso, activo) VALUES (?, ?, 1)
            `);

            permisos.forEach((permiso: string) => {
              stmt.run([id, permiso]);
            });

            stmt.finalize((err) => {
              if (err) {
                console.error('Error al agregar nuevos permisos:', err);
              }
            });
          }
        });
      }

      console.log(`✅ Rol actualizado: ID ${id}`);
      res.json({ mensaje: 'Rol actualizado exitosamente' });
    });
  });
});

/**
 * DELETE /api/roles/:id
 * Desactivar rol (soft delete) (solo superusuarios)
 * Solo si no tiene usuarios asignados
 */
router.delete('/:id', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar que el rol no tenga usuarios activos
  db.get(`
    SELECT COUNT(*) as count
    FROM usuarios
    WHERE rol_id = ? AND activo = 1
  `, [id], (err, row: any) => {
    if (err) {
      console.error('Error al verificar usuarios:', err);
      return res.status(500).json({ error: 'Error al verificar usuarios del rol' });
    }

    if (row.count > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar el rol porque tiene ${row.count} usuario(s) asignado(s)` 
      });
    }

    // Desactivar rol
    db.run(`
      UPDATE roles SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [id], function(err) {
      if (err) {
        console.error('Error al desactivar rol:', err);
        return res.status(500).json({ error: 'Error al desactivar rol' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      console.log(`✅ Rol desactivado: ID ${id}`);
      res.json({ mensaje: 'Rol desactivado exitosamente' });
    });
  });
});

/**
 * GET /api/roles/:id/usuarios
 * Obtener usuarios asignados a un rol
 */
router.get('/:id/usuarios', verificarSuperUsuario, (req: Request, res: Response) => {
  const { id } = req.params;

  db.all(`
    SELECT 
      u.id,
      u.usuario,
      u.nombre_completo,
      u.activo,
      u.ultimo_login
    FROM usuarios u
    WHERE u.rol_id = ?
    ORDER BY u.nombre_completo
  `, [id], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener usuarios del rol:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios del rol' });
    }

    res.json(rows);
  });
});

export default router;
