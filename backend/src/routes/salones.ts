import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

interface Salon {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Obtener todos los salones
router.get('/', (req: Request, res: Response) => {
  const query = 'SELECT * FROM salones ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: Salon[]) => {
    if (err) {
      console.error('Error al obtener salones:', err);
      return res.status(500).json({ error: 'Error al obtener los salones' });
    }
    
    // Convertir valores de SQLite
    const salones = rows.map(salon => ({
      ...salon,
      activo: Boolean(salon.activo)
    }));
    
    res.json(salones);
  });
});

// Obtener un salón específico
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = 'SELECT * FROM salones WHERE id = ?';
  
  db.get(query, [id], (err: any, row: Salon) => {
    if (err) {
      console.error('Error al obtener salón:', err);
      return res.status(500).json({ error: 'Error al obtener el salón' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Salón no encontrado' });
    }
    
    const salon = {
      ...row,
      activo: Boolean(row.activo)
    };
    
    res.json(salon);
  });
});

// Crear nuevo salón
router.post('/', (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const query = 'INSERT INTO salones (nombre, descripcion, activo) VALUES (?, ?, 1)';
  
  db.run(query, [nombre, descripcion || null], function(err: any) {
    if (err) {
      console.error('Error al crear salón:', err);
      return res.status(500).json({ error: 'Error al crear el salón' });
    }
    
    // Obtener el salón creado
    db.get('SELECT * FROM salones WHERE id = ?', [this.lastID], (err: any, row: Salon) => {
      if (err) {
        console.error('Error al obtener salón creado:', err);
        return res.status(500).json({ error: 'Error al obtener el salón creado' });
      }
      
      const salon = {
        ...row,
        activo: Boolean(row.activo)
      };
      
      res.status(201).json(salon);
    });
  });
});

// Actualizar salón
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, activo } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const query = 'UPDATE salones SET nombre = ?, descripcion = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [nombre, descripcion || null, activo ? 1 : 0, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar salón:', err);
      return res.status(500).json({ error: 'Error al actualizar el salón' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Salón no encontrado' });
    }
    
    // Obtener el salón actualizado
    db.get('SELECT * FROM salones WHERE id = ?', [id], (err: any, row: Salon) => {
      if (err) {
        console.error('Error al obtener salón actualizado:', err);
        return res.status(500).json({ error: 'Error al obtener el salón actualizado' });
      }
      
      const salon = {
        ...row,
        activo: Boolean(row.activo)
      };
      
      res.json(salon);
    });
  });
});

// Eliminar salón
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Verificar si el salón tiene mesas asociadas
  db.get('SELECT COUNT(*) as count FROM mesas WHERE salon_id = ?', [id], (err: any, row: any) => {
    if (err) {
      console.error('Error al verificar mesas:', err);
      return res.status(500).json({ error: 'Error al verificar mesas asociadas' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el salón porque tiene mesas asociadas. Primero elimine o reasigne las mesas.' 
      });
    }
    
    // Eliminar el salón
    const query = 'DELETE FROM salones WHERE id = ?';
    
    db.run(query, [id], function(err: any) {
      if (err) {
        console.error('Error al eliminar salón:', err);
        return res.status(500).json({ error: 'Error al eliminar el salón' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Salón no encontrado' });
      }
      
      res.json({ message: 'Salón eliminado exitosamente' });
    });
  });
});

// Obtener mesas de un salón específico
router.get('/:id/mesas', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = `
    SELECT m.*, s.nombre as salon_nombre 
    FROM mesas m 
    LEFT JOIN salones s ON m.salon_id = s.id 
    WHERE m.salon_id = ? 
    ORDER BY m.numero
  `;
  
  db.all(query, [id], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener mesas del salón:', err);
      return res.status(500).json({ error: 'Error al obtener las mesas del salón' });
    }
    
    // Convertir valores de SQLite
    const mesas = rows.map(mesa => ({
      ...mesa,
      ocupada: Boolean(mesa.ocupada)
    }));
    
    res.json(mesas);
  });
});

export default router;
