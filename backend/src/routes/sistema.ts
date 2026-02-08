import { Router } from 'express';
import { db } from '../database/database';
import { fullDatabaseReset } from '../database/reset';
import { verificarAutenticacion, verificarPermiso } from '../middleware/authMiddleware';

const router = Router();

// Resetear sistema de comandas de la empresa (SOLO ADMIN)
router.post('/resetear-sistema-comandas', verificarAutenticacion, verificarPermiso('admin'), async (req, res) => {
  try {
    const { empresaId } = req.context;
    
    // Eliminar TODOS los datos de la empresa
    await db.transaction().execute(async (trx) => {
      // Eliminar en orden para respetar foreign keys
      await trx.deleteFrom('comanda_items').where('empresa_id', '=', empresaId).execute();
      await trx.deleteFrom('comanda_mesas').where('empresa_id', '=', empresaId).execute();
      await trx.deleteFrom('comandas').where('empresa_id', '=', empresaId).execute();
      await trx.deleteFrom('facturas').where('empresa_id', '=', empresaId).execute();
      await trx.deleteFrom('productos').where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('categorias' as any) as any).where('empresa_id', '=', empresaId).execute();
      await trx.updateTable('mesas').set({ ocupada: false }).where('empresa_id', '=', empresaId).execute();
      await trx.deleteFrom('salones').where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('personalizacion_items' as any) as any).where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('personalizacion_categorias' as any) as any).where('empresa_id', '=', empresaId).execute();
      // Nómina
      await trx.deleteFrom('nomina_pagos').where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('nomina_detalle' as any) as any).where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('nomina' as any) as any).where('empresa_id', '=', empresaId).execute();
      await (trx.deleteFrom('historial_nomina' as any) as any).where('empresa_id', '=', empresaId).execute();
    });
    
    res.json({ 
      success: true, 
      mensaje: 'Sistema de comandas reseteado exitosamente' 
    });
  } catch (err: any) {
    console.error('Error al resetear sistema de comandas:', err);
    res.status(500).json({ 
      error: 'Error al resetear sistema de comandas',
      detalles: err.message 
    });
  }
});

// Liberar todas las mesas de la empresa
router.post('/liberar-mesas', verificarAutenticacion, verificarPermiso('admin'), async (req, res) => {
  try {
    const { empresaId } = req.context;
    
    let comandasEliminadas = 0;
    let mesasLiberadas = 0;
    
    await db.transaction().execute(async (trx) => {
      const comandasActivas = await trx.selectFrom('comandas')
        .select('id')
        .where('empresa_id', '=', empresaId)
        .where('estado', 'in', ['pendiente', 'preparando', 'lista', 'entregada'])
        .execute();

      const comandaIds = comandasActivas.map(c => c.id);
      comandasEliminadas = comandaIds.length;

      if (comandaIds.length > 0) {
        await trx.deleteFrom('comanda_items').where('comanda_id', 'in', comandaIds).where('empresa_id', '=', empresaId).execute();
        await trx.deleteFrom('comanda_mesas').where('comanda_id', 'in', comandaIds).where('empresa_id', '=', empresaId).execute();
        await trx.deleteFrom('comandas').where('id', 'in', comandaIds).where('empresa_id', '=', empresaId).execute();
      }

      const resultMesas = await trx.updateTable('mesas').set({ ocupada: false }).where('empresa_id', '=', empresaId).executeTakeFirst();
      mesasLiberadas = Number(resultMesas.numUpdatedRows || 0);
    });

    res.json({ 
      success: true, 
      mensaje: 'Mesas liberadas y comandas activas eliminadas',
      mesasLiberadas,
      comandasEliminadas
    });
  } catch (error: any) {
    console.error('Error al liberar mesas:', error);
    res.status(500).json({ error: 'Error al liberar mesas', detalles: error.message });
  }
});

// Limpiar comandas antiguas (más de 30 días) de la empresa
router.post('/limpiar-comandas-antiguas', verificarAutenticacion, verificarPermiso('admin'), async (req, res) => {
  try {
    const { empresaId } = req.context;
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const resultComandas = await db.deleteFrom('comandas')
      .where('empresa_id', '=', empresaId)
      .where('fecha_apertura', '<=', hace30Dias as any)
      .executeTakeFirst();

    const resultFacturas = await db.deleteFrom('facturas')
      .where('empresa_id', '=', empresaId)
      .where('fecha_emision', '<=', hace30Dias as any)
      .executeTakeFirst();

    res.json({ 
      success: true, 
      mensaje: `Se eliminaron registros antiguos correctamente`,
      comandas: Number(resultComandas.numDeletedRows || 0),
      facturas: Number(resultFacturas.numDeletedRows || 0)
    });
  } catch (err: any) {
    console.error('Error al limpiar registros antiguos:', err);
    res.status(500).json({ error: 'Error al limpiar registros antiguos', detalles: err.message });
  }
});

// Limpiar SOLO comandas (todas de la empresa)
router.post('/limpiar-solo-comandas', verificarAutenticacion, verificarPermiso('admin'), async (req, res) => {
  try {
    const { empresaId } = req.context;

    let comandas = 0;
    let facturas = 0;
    let items = 0;
    let mesasLiberadas = 0;

    await db.transaction().execute(async (trx) => {
      // Orden crítico: primero eliminar facturas (tienen FK a comandas)
      const resultFacturas = await trx.deleteFrom('facturas').where('empresa_id', '=', empresaId).executeTakeFirst();
      facturas = Number(resultFacturas.numDeletedRows || 0);
      
      // Luego eliminar items y mesas de comandas
      const resultItems = await trx.deleteFrom('comanda_items').where('empresa_id', '=', empresaId).executeTakeFirst();
      items = Number(resultItems.numDeletedRows || 0);
      
      await trx.deleteFrom('comanda_mesas').where('empresa_id', '=', empresaId).execute();
      
      // Ahora sí eliminar comandas
      const resultComandas = await trx.deleteFrom('comandas').where('empresa_id', '=', empresaId).executeTakeFirst();
      comandas = Number(resultComandas.numDeletedRows || 0);
      
      // Finalmente liberar mesas
      const resultMesas = await trx.updateTable('mesas').set({ ocupada: false }).where('empresa_id', '=', empresaId).executeTakeFirst();
      mesasLiberadas = Number(resultMesas.numUpdatedRows || 0);
    });

    res.json({ 
      success: true, 
      mensaje: 'Todas las comandas y facturas de la empresa fueron eliminadas',
      comandas,
      facturas,
      items,
      mesasLiberadas
    });
  } catch (err: any) {
    console.error('Error al limpiar comandas:', err);
    res.status(500).json({ error: 'Error al limpiar comandas', detalles: err.message });
  }
});

// Obtener límites de licencia de la empresa
router.get('/limites-licencia', verificarAutenticacion, async (req, res) => {
  try {
    const { empresaId } = req.context;

    // Obtener la licencia activa de la empresa
    const licencia = await db
      .selectFrom('licencias')
      .select(['max_usuarios', 'max_mesas', 'plan', 'estado', 'fecha_fin'])
      .where('empresa_id', '=', empresaId)
      .where('estado', 'in', ['activo', 'prueba'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!licencia) {
      // Valores por defecto si no hay licencia
      return res.json({
        max_usuarios: 5,
        max_mesas: 20,
        plan: 'basico',
        estado: 'sin_licencia',
        sin_licencia: true
      });
    }

    // Contar usuarios y mesas actuales
    const [usuariosCount, mesasCount] = await Promise.all([
      db.selectFrom('usuarios')
        .select(db.fn.count<number>('id').as('count'))
        .where('empresa_id', '=', empresaId)
        .where('activo', '=', true)
        .executeTakeFirst(),
      db.selectFrom('mesas')
        .select(db.fn.count<number>('id').as('count'))
        .where('empresa_id', '=', empresaId)
        .where('activo', '=', true)
        .executeTakeFirst()
    ]);

    res.json({
      max_usuarios: licencia.max_usuarios || 5,
      max_mesas: licencia.max_mesas || 20,
      plan: licencia.plan,
      estado: licencia.estado,
      usuarios_actuales: Number(usuariosCount?.count || 0),
      mesas_actuales: Number(mesasCount?.count || 0),
      puede_crear_usuarios: Number(usuariosCount?.count || 0) < (licencia.max_usuarios || 5),
      puede_crear_mesas: Number(mesasCount?.count || 0) < (licencia.max_mesas || 20)
    });
  } catch (err: any) {
    console.error('Error al obtener límites de licencia:', err);
    res.status(500).json({ error: 'Error al obtener límites de licencia' });
  }
});

export default router;
