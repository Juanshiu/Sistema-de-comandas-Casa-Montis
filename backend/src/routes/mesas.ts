import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Mesa } from '../models';

const router = Router();

// Obtener todas las mesas
router.get('/', (req: Request, res: Response) => {
  const query = 'SELECT * FROM mesas ORDER BY numero';
  
  db.all(query, [], (err: any, rows: Mesa[]) => {
    if (err) {
      console.error('Error al obtener mesas:', err);
      return res.status(500).json({ error: 'Error al obtener las mesas' });
    }
    
    // Convertir valores de SQLite
    const mesas = rows.map(mesa => ({
      ...mesa,
      ocupada: Boolean(mesa.ocupada)
    }));
    
    res.json(mesas);
  });
});

// Obtener una mesa específica
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = 'SELECT * FROM mesas WHERE id = ?';
  
  db.get(query, [id], (err: any, row: Mesa) => {
    if (err) {
      console.error('Error al obtener mesa:', err);
      return res.status(500).json({ error: 'Error al obtener la mesa' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    const mesa = {
      ...row,
      ocupada: Boolean(row.ocupada)
    };
    
    res.json(mesa);
  });
});

// Actualizar estado de una mesa
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { ocupada } = req.body;
  
  if (typeof ocupada !== 'boolean') {
    return res.status(400).json({ error: 'El campo ocupada debe ser un boolean' });
  }
  
  const query = 'UPDATE mesas SET ocupada = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [ocupada ? 1 : 0, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar mesa:', err);
      return res.status(500).json({ error: 'Error al actualizar la mesa' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    // Obtener la mesa actualizada
    db.get('SELECT * FROM mesas WHERE id = ?', [id], (err: any, row: Mesa) => {
      if (err) {
        console.error('Error al obtener mesa actualizada:', err);
        return res.status(500).json({ error: 'Error al obtener la mesa actualizada' });
      }
      
      const mesa = {
        ...row,
        ocupada: Boolean(row.ocupada)
      };
      
      res.json(mesa);
    });
  });
});

// Crear nueva mesa
router.post('/', (req: Request, res: Response) => {
  const { numero, capacidad } = req.body;
  
  if (!numero || !capacidad) {
    return res.status(400).json({ error: 'Número y capacidad son requeridos' });
  }
  
  const query = 'INSERT INTO mesas (numero, capacidad) VALUES (?, ?)';
  
  db.run(query, [numero, capacidad], function(err: any) {
    if (err) {
      console.error('Error al crear mesa:', err);
      return res.status(500).json({ error: 'Error al crear la mesa' });
    }
    
    // Obtener la mesa creada
    db.get('SELECT * FROM mesas WHERE id = ?', [this.lastID], (err: any, row: Mesa) => {
      if (err) {
        console.error('Error al obtener mesa creada:', err);
        return res.status(500).json({ error: 'Error al obtener la mesa creada' });
      }
      
      const mesa = {
        ...row,
        ocupada: Boolean(row.ocupada)
      };
      
      res.status(201).json(mesa);
    });
  });
});

// Liberar mesa (marcar como disponible)
router.patch('/:id/liberar', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'UPDATE mesas SET ocupada = 0 WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al liberar mesa:', err);
      return res.status(500).json({ error: 'Error al liberar la mesa' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    // Obtener la mesa actualizada
    db.get('SELECT * FROM mesas WHERE id = ?', [id], (err: any, row: Mesa) => {
      if (err) {
        console.error('Error al obtener mesa liberada:', err);
        return res.status(500).json({ error: 'Error al obtener la mesa liberada' });
      }
      
      const mesa = {
        ...row,
        ocupada: Boolean(row.ocupada)
      };
      
      res.json(mesa);
    });
  });
});

export default router;
