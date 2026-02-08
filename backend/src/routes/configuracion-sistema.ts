import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion, verificarPermiso } from '../middleware/authMiddleware';

const router = Router();

// GET - Obtener configuración del sistema
router.get('/', verificarAutenticacion, async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;

    const results = await db.selectFrom('config_sistema')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .execute();

    // Default values
    const config: any = {
      inventario_avanzado: false,
      critico_modo: 'CRITICO'
    };

    results.forEach(row => {
      // Postgres returns jsonb as object usually, but let's be safe
      config[row.clave] = row.valor;
    });

    res.json(config);
  } catch (err) {
    console.error('Error al obtener configuración del sistema:', err);
    res.status(500).json({ error: 'Error al obtener configuración del sistema' });
  }
});

// PUT - Actualizar configuración del sistema
router.put('/', verificarAutenticacion, verificarPermiso('gestionar_sistema'), async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { inventario_avanzado, critico_modo } = req.body;

    const updates = [];

    if (inventario_avanzado !== undefined) {
      updates.push({ clave: 'inventario_avanzado', valor: !!inventario_avanzado });
    }

    if (critico_modo !== undefined) {
      const criticoModoNormalizado = String(critico_modo || '').toUpperCase();
      const criticoModoValido = ['CRITICO', 'BAJO', 'NUNCA', 'BLOQUEAR'].includes(criticoModoNormalizado)
        ? (criticoModoNormalizado === 'BLOQUEAR' ? 'CRITICO' : criticoModoNormalizado)
        : 'CRITICO';
      updates.push({ clave: 'critico_modo', valor: criticoModoValido });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Debe enviar inventario_avanzado o critico_modo' });
    }

    for (const item of updates) {
      await db.insertInto('config_sistema')
        .values({
          empresa_id: empresaId,
          clave: item.clave,
          valor: JSON.stringify(item.valor) as any
        })
        .onConflict(oc => oc
          .columns(['empresa_id', 'clave'])
          .doUpdateSet({ valor: JSON.stringify(item.valor) as any })
        )
        .execute();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error al actualizar configuración del sistema:', err);
    res.status(500).json({ error: 'Error al actualizar configuración del sistema' });
  }
});

export default router;