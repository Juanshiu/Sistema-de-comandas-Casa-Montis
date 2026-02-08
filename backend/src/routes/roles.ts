import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion, verificarPermiso, verificarSuperUsuario } from '../middleware/authMiddleware';

const router = Router();

router.use(verificarAutenticacion);

// Listar Roles (Superusuario o ver_roles)
router.get('/', verificarSuperUsuario, async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    
    // Roles de la empresa con conteo de usuarios
    const roles = await db.selectFrom('roles')
        .leftJoin('usuarios', 'usuarios.rol_id', 'roles.id')
        .select([
          'roles.id', 
          'roles.nombre', 
          'roles.descripcion', 
          'roles.activo',
          'roles.es_superusuario',
          'roles.created_at',
          db.fn.count('usuarios.id').as('cantidad_usuarios')
        ])
        .where('roles.empresa_id', '=', empresaId)
        .groupBy(['roles.id', 'roles.nombre', 'roles.descripcion', 'roles.activo', 'roles.es_superusuario', 'roles.created_at'])
        .orderBy('roles.nombre')
        .execute();

    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// Crear Rol
router.post('/', verificarSuperUsuario, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { nombre, descripcion, es_superusuario = false, permisos = [], activo = true } = req.body;

        // Crear el rol
        const newRol = await db.insertInto('roles')
            .values({
                empresa_id: empresaId,
                nombre,
                descripcion,
                es_superusuario,
                activo
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        
        // Si hay permisos y no es superusuario, asignarlos
        if (permisos.length > 0 && !es_superusuario) {
            // Obtener IDs de permisos por clave
            const permisosDb = await db.selectFrom('permisos')
                .select(['id', 'clave'])
                .where('clave', 'in', permisos)
                .execute();

            // Insertar relaciones rol-permiso
            for (const permiso of permisosDb) {
                await db.insertInto('permisos_rol')
                    .values({
                        rol_id: newRol.id,
                        permiso_id: permiso.id,
                        empresa_id: empresaId
                    })
                    .execute();
            }
        }
        
        res.status(201).json(newRol);
    } catch (error) {
        console.error('Error creating rol:', error);
        res.status(500).json({ error: 'Error al crear rol' });
    }
});

// Detalle Rol (con permisos)
router.get('/:id', verificarSuperUsuario, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;

        const rol = await db.selectFrom('roles')
            .selectAll()
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();
        
        if (!rol) {
            res.status(404).json({ error: 'Rol no encontrado' });
            return;
        }

        // Obtener permisos asignados al rol
        const permisosRol = await db.selectFrom('permisos_rol')
            .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
            .select(['permisos.clave as permiso', 'permisos.nombre'])
            .where('permisos_rol.rol_id', '=', id)
            .where('permisos_rol.empresa_id', '=', empresaId)
            .execute();

        res.json({
            ...rol,
            permisos: permisosRol
        });
    } catch (error) {
        console.error('Error obteniendo rol:', error);
        res.status(500).json({ error: 'Error obteniendo rol' });
    }
});

// Actualizar Rol
router.put('/:id', verificarSuperUsuario, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;
        const { nombre, descripcion, es_superusuario, permisos, activo } = req.body;

        // Actualizar datos básicos del rol
        const updateData: any = {};
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (es_superusuario !== undefined) updateData.es_superusuario = es_superusuario;
        if (activo !== undefined) updateData.activo = activo;

        const result = await db.updateTable('roles')
            .set(updateData)
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .returningAll()
            .executeTakeFirst();
        
        if (!result) {
            res.status(404).json({ error: 'Rol no encontrado' });
            return;
        }

        // Actualizar permisos si se proporcionaron
        if (permisos !== undefined && !es_superusuario) {
            // Eliminar permisos actuales
            await db.deleteFrom('permisos_rol')
                .where('rol_id', '=', id)
                .where('empresa_id', '=', empresaId)
                .execute();

            // Insertar nuevos permisos
            if (permisos.length > 0) {
                const permisosDb = await db.selectFrom('permisos')
                    .select(['id', 'clave'])
                    .where('clave', 'in', permisos)
                    .execute();

                for (const permiso of permisosDb) {
                    await db.insertInto('permisos_rol')
                        .values({
                            rol_id: id,
                            permiso_id: permiso.id,
                            empresa_id: empresaId
                        })
                        .execute();
                }
            }
        }

        // Si es superusuario, asignar todos los permisos
        if (es_superusuario) {
            // Eliminar permisos individuales (superusuario tiene todos)
            await db.deleteFrom('permisos_rol')
                .where('rol_id', '=', id)
                .where('empresa_id', '=', empresaId)
                .execute();

            // Asignar todos los permisos
            const todosPermisos = await db.selectFrom('permisos').select('id').execute();
            for (const permiso of todosPermisos) {
                await db.insertInto('permisos_rol')
                    .values({
                        rol_id: id,
                        permiso_id: permiso.id,
                        empresa_id: empresaId
                    })
                    .execute();
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({ error: 'Error actualizando rol' });
    }
});

// Eliminar Rol
router.delete('/:id', verificarSuperUsuario, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;

        const result = await db.deleteFrom('roles')
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();
        
        if (Number(result.numDeletedRows) === 0) {
            res.status(404).json({ error: 'Rol no encontrado' });
            return;
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando rol' });
    }
});

export default router;