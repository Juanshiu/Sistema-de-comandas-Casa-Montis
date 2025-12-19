import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Mesa } from '../models';

const router = Router();

// Obtener todas las mesas
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT m.*, s.nombre as salon_nombre 
    FROM mesas m 
    LEFT JOIN salones s ON m.salon_id = s.id 
    ORDER BY 
      CASE 
        WHEN m.numero GLOB '[0-9]*' THEN CAST(m.numero AS INTEGER)
        ELSE 999999 
      END,
      m.numero
  `;
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener mesas:', err);
      return res.status(500).json({ error: 'Error al obtener las mesas' });
    }
    
    // Convertir valores de SQLite y mapear salon
    const mesas = rows.map(mesa => ({
      id: mesa.id,
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      salon_id: mesa.salon_id,
      salon: mesa.salon_nombre || 'Sin salón',
      ocupada: Boolean(mesa.ocupada),
      created_at: mesa.created_at,
      updated_at: mesa.updated_at
    }));
    
    res.json(mesas);
  });
});

// Obtener una mesa específica
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = `
    SELECT m.*, s.nombre as salon_nombre 
    FROM mesas m 
    LEFT JOIN salones s ON m.salon_id = s.id 
    WHERE m.id = ?
  `;
  
  db.get(query, [id], (err: any, row: any) => {
    if (err) {
      console.error('Error al obtener mesa:', err);
      return res.status(500).json({ error: 'Error al obtener la mesa' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    const mesa = {
      id: row.id,
      numero: row.numero,
      capacidad: row.capacidad,
      salon_id: row.salon_id,
      salon: row.salon_nombre || 'Sin salón',
      ocupada: Boolean(row.ocupada),
      created_at: row.created_at,
      updated_at: row.updated_at
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
  const { numero, capacidad, salon_id } = req.body;
  
  if (!numero || !capacidad) {
    return res.status(400).json({ error: 'Número y capacidad son requeridos' });
  }
  
  // Verificar que el salón existe
  if (salon_id) {
    db.get('SELECT id FROM salones WHERE id = ?', [salon_id], (err: any, row: any) => {
      if (err || !row) {
        return res.status(400).json({ error: 'Salón no encontrado' });
      }
      
      crearMesa();
    });
  } else {
    crearMesa();
  }
  
  function crearMesa() {
    const query = 'INSERT INTO mesas (numero, capacidad, salon_id) VALUES (?, ?, ?)';
    
    db.run(query, [numero, capacidad, salon_id || null], function(err: any) {
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
  }
});

// Actualizar mesa
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { numero, capacidad, salon_id } = req.body;
  
  if (!numero || !capacidad) {
    return res.status(400).json({ error: 'Número y capacidad son requeridos' });
  }
  
  const query = 'UPDATE mesas SET numero = ?, capacidad = ?, salon_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [numero, capacidad, salon_id || null, id], function(err: any) {
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

// Eliminar mesa
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Verificar si la mesa tiene comandas asociadas (comandas activas)
  db.get(`
    SELECT COUNT(*) as count 
    FROM comanda_mesas 
    WHERE mesa_id = ? 
    AND comanda_id IN (SELECT id FROM comandas WHERE estado != 'facturada')
  `, [id], (err: any, row: any) => {
    if (err) {
      console.error('Error al verificar comandas:', err);
      return res.status(500).json({ error: 'Error al verificar comandas asociadas' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la mesa porque tiene comandas activas asociadas' 
      });
    }
    
    // Eliminar la mesa
    const query = 'DELETE FROM mesas WHERE id = ?';
    
    db.run(query, [id], function(err: any) {
      if (err) {
        console.error('Error al eliminar mesa:', err);
        return res.status(500).json({ error: 'Error al eliminar la mesa' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Mesa no encontrada' });
      }
      
      res.json({ message: 'Mesa eliminada exitosamente' });
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
