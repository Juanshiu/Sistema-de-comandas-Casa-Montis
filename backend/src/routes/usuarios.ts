/// <reference path="../types/express.d.ts" />
import express, { Request, Response } from 'express';
import { UsuarioService } from '../services/usuarioService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const usuarioService = new UsuarioService();

// Middleware de autenticación global para usuarios
router.use(verificarAutenticacion);

/**
 * GET /api/usuarios
 * Listar todos los usuarios de la empresa autenticada
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const usuarios = await usuarioService.listarUsuarios(empresaId);
    res.json(usuarios);
  } catch (error: any) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error interno al obtener usuarios' });
  }
});

/**
 * GET /api/usuarios/:id
 * Obtener un usuario específico (Validando pertenencia a empresa)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    
    const usuario = await usuarioService.obtenerUsuario(id, empresaId);
    res.json(usuario);
  } catch (error: any) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * POST /api/usuarios
 * Crear usuario en la empresa actual
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const nuevoUsuario = await usuarioService.crearUsuario(empresaId, req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error: any) {
    if (error.message.includes('Faltan campos') || error.message.includes('ya está registrado')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno al crear usuario' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar usuario
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    
    const actualizado = await usuarioService.actualizarUsuario(id, empresaId, req.body);
    res.json(actualizado);
  } catch (error: any) {
    if (error.message === 'Usuario no encontrado') return res.status(404).json({ error: error.message });
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno al actualizar usuario' });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Eliminar (lógicamente o físicamente)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;

    const eliminado = await usuarioService.eliminarUsuario(id, empresaId); 
    if (!eliminado) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
