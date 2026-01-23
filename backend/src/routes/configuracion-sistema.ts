import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

// GET - Obtener configuración del sistema
router.get('/', (req: Request, res: Response) => {
  db.get('SELECT * FROM config_sistema ORDER BY id DESC LIMIT 1', [], (err, row: any) => {
    if (err) {
      console.error('Error al obtener configuración del sistema:', err);
      return res.status(500).json({ error: 'Error al obtener configuración del sistema' });
    }

    if (!row) {
      return res.json({ inventario_avanzado: false, critico_modo: 'CRITICO' });
    }

    res.json({
      id: row.id,
      inventario_avanzado: row.inventario_avanzado === 1,
      critico_modo: row.critico_modo || 'CRITICO',
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  });
});

// PUT - Actualizar configuración del sistema
router.put('/', (req: Request, res: Response) => {
  const { inventario_avanzado, critico_modo } = req.body;

  if (inventario_avanzado === undefined && critico_modo === undefined) {
    return res.status(400).json({ error: 'Debe enviar inventario_avanzado o critico_modo' });
  }

  const inventarioAvanzadoInt = inventario_avanzado ? 1 : 0;
  const criticoModoNormalizado = String(critico_modo || '').toUpperCase();
  const criticoModoValido = ['CRITICO', 'BAJO', 'NUNCA', 'BLOQUEAR'].includes(criticoModoNormalizado)
    ? (criticoModoNormalizado === 'BLOQUEAR' ? 'CRITICO' : criticoModoNormalizado)
    : 'CRITICO';

  db.get('SELECT id FROM config_sistema ORDER BY id DESC LIMIT 1', [], (err, row: any) => {
    if (err) {
      console.error('Error al obtener configuración del sistema:', err);
      return res.status(500).json({ error: 'Error al obtener configuración del sistema' });
    }

    if (row) {
      const inventarioFinal = inventario_avanzado === undefined ? row.inventario_avanzado : inventarioAvanzadoInt;
      const criticoFinal = critico_modo === undefined ? (row.critico_modo || 'CRITICO') : criticoModoValido;

      db.run(
        'UPDATE config_sistema SET inventario_avanzado = ?, critico_modo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [inventarioFinal, criticoFinal, row.id],
        function (updateErr) {
          if (updateErr) {
            console.error('Error al actualizar configuración del sistema:', updateErr);
            return res.status(500).json({ error: 'Error al actualizar configuración del sistema' });
          }

          db.get('SELECT * FROM config_sistema WHERE id = ?', [row.id], (err2, updatedRow: any) => {
            if (err2) {
              return res.status(500).json({ error: 'Error al obtener configuración actualizada' });
            }

            res.json({
              id: updatedRow.id,
              inventario_avanzado: updatedRow.inventario_avanzado === 1,
              critico_modo: updatedRow.critico_modo || 'CRITICO',
              created_at: updatedRow.created_at,
              updated_at: updatedRow.updated_at
            });
          });
        }
      );
    } else {
      db.run(
        'INSERT INTO config_sistema (inventario_avanzado, critico_modo) VALUES (?, ?)',
        [inventarioAvanzadoInt, criticoModoValido],
        function (insertErr) {
          if (insertErr) {
            console.error('Error al crear configuración del sistema:', insertErr);
            return res.status(500).json({ error: 'Error al crear configuración del sistema' });
          }

          db.get('SELECT * FROM config_sistema WHERE id = ?', [this.lastID], (err2, createdRow: any) => {
            if (err2) {
              return res.status(500).json({ error: 'Error al obtener configuración creada' });
            }

            res.json({
              id: createdRow.id,
              inventario_avanzado: createdRow.inventario_avanzado === 1,
              critico_modo: createdRow.critico_modo || 'CRITICO',
              created_at: createdRow.created_at,
              updated_at: createdRow.updated_at
            });
          });
        }
      );
    }
  });
});

export default router;
