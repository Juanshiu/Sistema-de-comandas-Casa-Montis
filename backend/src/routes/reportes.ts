import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { convertirAHoraColombia } from '../utils/dateUtils';

const router = Router();

// Helper: Convertir fecha a formato YYYY-MM-DD en zona horaria de Colombia
const formatearFechaColombia = (fecha: string | Date): string => {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const fechaColombia = convertirAHoraColombia(fechaObj);
  
  const year = fechaColombia.getFullYear();
  const month = String(fechaColombia.getMonth() + 1).padStart(2, '0');
  const day = String(fechaColombia.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Helper: Obtener fecha anterior
const obtenerFechaAnterior = (fecha: string, dias: number = 1): string => {
  const fechaObj = new Date(fecha);
  fechaObj.setDate(fechaObj.getDate() - dias);
  return fechaObj.toISOString().split('T')[0];
};

// Reporte de ventas por día con comparativas y análisis avanzado
router.get('/ventas', (req: Request, res: Response) => {
  const { fecha } = req.query;
  const fechaBusqueda = (fecha as string) || formatearFechaColombia(new Date());
  
  console.log('📊 Generando reporte para fecha:', fechaBusqueda);

  // Obtener totales del día actual
  const totalesQuery = `
    SELECT 
      COUNT(*) as cantidad_comandas,
      COALESCE(SUM(total), 0) as total_ventas,
      COALESCE(SUM(subtotal), 0) as subtotal_ventas
    FROM facturas 
    WHERE DATE(fecha_creacion) = ?
  `;

  db.get(totalesQuery, [fechaBusqueda], (err: any, totales: any) => {
    if (err) {
      console.error('Error al obtener totales:', err);
      return res.status(500).json({ error: 'Error al obtener los totales de ventas' });
    }

    // Obtener totales del día anterior para comparativa
    const fechaAnterior = obtenerFechaAnterior(fechaBusqueda, 1);
    db.get(totalesQuery, [fechaAnterior], (err: any, totalesAyer: any) => {
      if (err) {
        console.error('Error al obtener totales de ayer:', err);
        totalesAyer = { cantidad_comandas: 0, total_ventas: 0, subtotal_ventas: 0 };
      }

      // Obtener totales de hace 7 días para comparativa
      const fechaSemanaAnterior = obtenerFechaAnterior(fechaBusqueda, 7);
      db.get(totalesQuery, [fechaSemanaAnterior], (err: any, totalesSemanaAnterior: any) => {
        if (err) {
          console.error('Error al obtener totales de semana anterior:', err);
          totalesSemanaAnterior = { cantidad_comandas: 0, total_ventas: 0, subtotal_ventas: 0 };
        }

        // Calcular promedio semanal (últimos 7 días)
        const fechaInicio7Dias = obtenerFechaAnterior(fechaBusqueda, 7);
        const promedioQuery = `
          SELECT 
            AVG(total_ventas) as promedio_ventas,
            AVG(cantidad_comandas) as promedio_comandas
          FROM (
            SELECT 
              DATE(fecha_creacion) as fecha,
              COALESCE(SUM(total), 0) as total_ventas,
              COUNT(*) as cantidad_comandas
            FROM facturas 
            WHERE DATE(fecha_creacion) BETWEEN ? AND ?
            GROUP BY DATE(fecha_creacion)
          )
        `;

        db.get(promedioQuery, [fechaInicio7Dias, fechaBusqueda], (err: any, promedios: any) => {
          if (err) {
            console.error('Error al obtener promedios:', err);
            promedios = { promedio_ventas: 0, promedio_comandas: 0 };
          }

          // Obtener métodos de pago
          const metodoPagoQuery = `
            SELECT 
              metodo_pago,
              COUNT(*) as cantidad,
              COALESCE(SUM(total), 0) as total
            FROM facturas 
            WHERE DATE(fecha_creacion) = ?
            GROUP BY metodo_pago
          `;

          db.all(metodoPagoQuery, [fechaBusqueda], (err: any, metodosPago: any[]) => {
            if (err) {
              console.error('Error al obtener métodos de pago:', err);
              metodosPago = [];
            }

            // Obtener productos más vendidos
            const productosQuery = `
              SELECT 
                p.id,
                p.nombre,
                p.descripcion,
                p.categoria,
                p.precio,
                SUM(ci.cantidad) as cantidad_vendida,
                SUM(ci.subtotal) as total_vendido
              FROM comanda_items ci
              JOIN productos p ON ci.producto_id = p.id
              JOIN comandas c ON ci.comanda_id = c.id
              JOIN facturas f ON c.id = f.comanda_id
              WHERE DATE(f.fecha_creacion) = ?
              GROUP BY p.id, p.nombre, p.descripcion, p.categoria, p.precio
              ORDER BY cantidad_vendida DESC
              LIMIT 20
            `;

            db.all(productosQuery, [fechaBusqueda], (err: any, productosRows: any[]) => {
              if (err) {
                console.error('Error al obtener productos:', err);
                return res.status(500).json({ error: 'Error al obtener productos más vendidos' });
              }

              const productos_mas_vendidos = productosRows.map(row => ({
                producto: {
                  id: row.id,
                  nombre: row.nombre,
                  descripcion: row.descripcion,
                  categoria: row.categoria,
                  precio: row.precio,
                  disponible: true
                },
                cantidad_vendida: row.cantidad_vendida,
                total_vendido: row.total_vendido
              }));

              // Obtener ventas por hora
              const ventasHoraQuery = `
                SELECT 
                  CAST(strftime('%H', fecha_creacion) AS INTEGER) as hora,
                  COUNT(*) as comandas,
                  COALESCE(SUM(total), 0) as ventas
                FROM facturas 
                WHERE DATE(fecha_creacion) = ?
                GROUP BY CAST(strftime('%H', fecha_creacion) AS INTEGER)
                ORDER BY hora
              `;

              db.all(ventasHoraQuery, [fechaBusqueda], (err: any, ventasRows: any[]) => {
                if (err) {
                  console.error('Error al obtener ventas por hora:', err);
                  return res.status(500).json({ error: 'Error al obtener ventas por hora' });
                }

                const ventas_por_hora = ventasRows.map(row => ({
                  hora: row.hora.toString(),
                  comandas: row.comandas,
                  ventas: row.ventas
                }));

                // Calcular comparativas
                const comparativas = {
                  vs_dia_anterior: {
                    ventas: totales.total_ventas - totalesAyer.total_ventas,
                    ventas_porcentaje: totalesAyer.total_ventas > 0 
                      ? ((totales.total_ventas - totalesAyer.total_ventas) / totalesAyer.total_ventas) * 100 
                      : 0,
                    comandas: totales.cantidad_comandas - totalesAyer.cantidad_comandas,
                    comandas_porcentaje: totalesAyer.cantidad_comandas > 0 
                      ? ((totales.cantidad_comandas - totalesAyer.cantidad_comandas) / totalesAyer.cantidad_comandas) * 100 
                      : 0
                  },
                  vs_semana_anterior: {
                    ventas: totales.total_ventas - totalesSemanaAnterior.total_ventas,
                    ventas_porcentaje: totalesSemanaAnterior.total_ventas > 0 
                      ? ((totales.total_ventas - totalesSemanaAnterior.total_ventas) / totalesSemanaAnterior.total_ventas) * 100 
                      : 0,
                    comandas: totales.cantidad_comandas - totalesSemanaAnterior.cantidad_comandas,
                    comandas_porcentaje: totalesSemanaAnterior.cantidad_comandas > 0 
                      ? ((totales.cantidad_comandas - totalesSemanaAnterior.cantidad_comandas) / totalesSemanaAnterior.cantidad_comandas) * 100 
                      : 0
                  },
                  vs_promedio_semanal: {
                    ventas: totales.total_ventas - (promedios.promedio_ventas || 0),
                    ventas_porcentaje: (promedios.promedio_ventas || 0) > 0 
                      ? ((totales.total_ventas - promedios.promedio_ventas) / promedios.promedio_ventas) * 100 
                      : 0,
                    comandas: totales.cantidad_comandas - (promedios.promedio_comandas || 0),
                    comandas_porcentaje: (promedios.promedio_comandas || 0) > 0 
                      ? ((totales.cantidad_comandas - promedios.promedio_comandas) / promedios.promedio_comandas) * 100 
                      : 0
                  }
                };

                // Identificar horas pico y muertas
                const maxVenta = Math.max(...ventas_por_hora.map(v => v.ventas), 0);
                const minVenta = Math.min(...ventas_por_hora.map(v => v.ventas), maxVenta);
                const ventasConEstado = ventas_por_hora.map(v => ({
                  ...v,
                  es_pico: v.ventas === maxVenta && maxVenta > 0,
                  es_muerta: v.ventas === minVenta && ventas_por_hora.length > 1
                }));

                // Generar alertas inteligentes
                const alertas: string[] = [];
                
                // Alerta: Ventas bajas
                if (comparativas.vs_promedio_semanal.ventas_porcentaje < -30) {
                  alertas.push('⚠️ Ventas inusualmente bajas comparado con el promedio semanal');
                }
                
                // Alerta: Promedio por comanda bajo
                const promedioActual = totales.cantidad_comandas > 0 ? totales.total_ventas / totales.cantidad_comandas : 0;
                const promedioSemanal = promedios.promedio_ventas / Math.max(promedios.promedio_comandas, 1);
                if (promedioActual < promedioSemanal * 0.8) {
                  alertas.push('⚠️ Promedio por comanda bajó significativamente');
                }
                
                // Alerta: Producto estrella
                if (productos_mas_vendidos.length > 0) {
                  const productoTop = productos_mas_vendidos[0];
                  alertas.push(`🔥 Producto estrella del día: ${productoTop.producto.nombre} (${productoTop.cantidad_vendida} unidades)`);
                }
                
                // Alerta: Pico de ventas
                if (ventasConEstado.some(v => v.es_pico)) {
                  const horaPico = ventasConEstado.find(v => v.es_pico);
                  if (horaPico) {
                    alertas.push(`🕒 Pico de ventas detectado a las ${horaPico.hora}:00 horas`);
                  }
                }
                
                // Alerta: Mejora de ventas
                if (comparativas.vs_dia_anterior.ventas_porcentaje > 20) {
                  alertas.push(`📈 ¡Excelente! Ventas ${comparativas.vs_dia_anterior.ventas_porcentaje.toFixed(0)}% superiores a ayer`);
                }

                // Formatear métodos de pago
                const metodos_pago = metodosPago.map(m => ({
                  metodo: m.metodo_pago,
                  cantidad: m.cantidad,
                  total: m.total,
                  porcentaje: totales.total_ventas > 0 ? (m.total / totales.total_ventas) * 100 : 0,
                  comision_estimada: m.metodo_pago === 'tarjeta' ? m.total * 0.03 : 0 // 3% estimado para tarjeta
                }));

                const reporte = {
                  fecha: fechaBusqueda,
                  total_ventas: totales.total_ventas,
                  cantidad_comandas: totales.cantidad_comandas,
                  promedio_por_comanda: totales.cantidad_comandas > 0 
                    ? totales.total_ventas / totales.cantidad_comandas 
                    : 0,
                  productos_mas_vendidos,
                  ventas_por_hora: ventasConEstado,
                  comparativas,
                  metodos_pago,
                  alertas
                };

                res.json(reporte);
              });
            });
          });
        });
      });
    });
  });
});

// Reporte de ventas por rango de fechas
router.get('/ventas/rango', (req: Request, res: Response) => {
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      error: 'Se requieren fechaInicio y fechaFin' 
    });
  }

  console.log('📊 Generando reporte de rango:', fechaInicio, 'a', fechaFin);

  const query = `
    SELECT 
      DATE(fecha_creacion) as fecha,
      COUNT(*) as cantidad_comandas,
      COALESCE(SUM(total), 0) as total_ventas
    FROM facturas 
    WHERE DATE(fecha_creacion) >= ? AND DATE(fecha_creacion) <= ?
    GROUP BY DATE(fecha_creacion)
    ORDER BY fecha
  `;

  db.all(query, [fechaInicio, fechaFin], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener reporte por rango:', err);
      return res.status(500).json({ error: 'Error al obtener el reporte por rango' });
    }

    // Para cada fecha, obtener productos más vendidos
    let completados = 0;
    const reportes: any[] = [];

    if (rows.length === 0) {
      return res.json([]);
    }

    rows.forEach(row => {
      // Obtener productos más vendidos para esta fecha
      const productosQuery = `
        SELECT 
          p.id,
          p.nombre,
          p.descripcion,
          p.categoria,
          p.precio,
          SUM(ci.cantidad) as cantidad_vendida,
          SUM(ci.subtotal) as total_vendido
        FROM comanda_items ci
        JOIN productos p ON ci.producto_id = p.id
        JOIN comandas c ON ci.comanda_id = c.id
        JOIN facturas f ON c.id = f.comanda_id
        WHERE DATE(f.fecha_creacion) = ?
        GROUP BY p.id, p.nombre, p.descripcion, p.categoria, p.precio
        ORDER BY cantidad_vendida DESC
        LIMIT 50
      `;

      db.all(productosQuery, [row.fecha], (err: any, productosRows: any[]) => {
        if (err) {
          console.error('Error al obtener productos para fecha', row.fecha, ':', err);
          productosRows = [];
        }

        const productos_mas_vendidos = productosRows.map(p => ({
          producto: {
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            categoria: p.categoria,
            precio: p.precio,
            disponible: true
          },
          cantidad_vendida: p.cantidad_vendida,
          total_vendido: p.total_vendido
        }));

        // Obtener ventas por hora para esta fecha
        const ventasHoraQuery = `
          SELECT 
            CAST(strftime('%H', fecha_creacion) AS INTEGER) as hora,
            COUNT(*) as comandas,
            COALESCE(SUM(total), 0) as ventas
          FROM facturas 
          WHERE DATE(fecha_creacion) = ?
          GROUP BY CAST(strftime('%H', fecha_creacion) AS INTEGER)
          ORDER BY hora
        `;

        db.all(ventasHoraQuery, [row.fecha], (err: any, ventasRows: any[]) => {
          if (err) {
            console.error('Error al obtener ventas por hora para fecha', row.fecha, ':', err);
            ventasRows = [];
          }

          const ventas_por_hora = ventasRows.map(v => ({
            hora: v.hora.toString(),
            comandas: v.comandas,
            ventas: v.ventas
          }));

          reportes.push({
            fecha: row.fecha,
            total_ventas: row.total_ventas,
            cantidad_comandas: row.cantidad_comandas,
            promedio_por_comanda: row.cantidad_comandas > 0 
              ? row.total_ventas / row.cantidad_comandas 
              : 0,
            productos_mas_vendidos,
            ventas_por_hora
          });

          completados++;
          
          // Cuando todas las consultas se completen, enviar respuesta
          if (completados === rows.length) {
            // Ordenar por fecha antes de enviar
            reportes.sort((a, b) => a.fecha.localeCompare(b.fecha));
            res.json(reportes);
          }
        });
      });
    });
  });
});

// Reporte de productos más vendidos por categoría
router.get('/productos/categoria/:categoria', (req: Request, res: Response) => {
  const { categoria } = req.params;
  const { fechaInicio, fechaFin } = req.query;

  let whereClause = 'WHERE p.categoria = ?';
  let params = [categoria];

  if (fechaInicio && fechaFin) {
    whereClause += ' AND DATE(f.fecha_creacion) BETWEEN ? AND ?';
    params.push(fechaInicio as string, fechaFin as string);
  }

  const query = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.categoria,
      p.precio,
      SUM(ci.cantidad) as cantidad_vendida,
      SUM(ci.subtotal) as total_vendido,
      COUNT(DISTINCT f.id) as facturas_con_producto
    FROM comanda_items ci
    JOIN productos p ON ci.producto_id = p.id
    JOIN comandas c ON ci.comanda_id = c.id
    JOIN facturas f ON c.id = f.comanda_id
    ${whereClause}
    GROUP BY p.id, p.nombre, p.descripcion, p.categoria, p.precio
    ORDER BY cantidad_vendida DESC
  `;

  db.all(query, params, (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener productos por categoría:', err);
      return res.status(500).json({ error: 'Error al obtener productos por categoría' });
    }

    const productos = rows.map(row => ({
      producto: {
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        categoria: row.categoria,
        precio: row.precio,
        disponible: true
      },
      cantidad_vendida: row.cantidad_vendida,
      total_vendido: row.total_vendido,
      facturas_con_producto: row.facturas_con_producto
    }));

    res.json(productos);
  });
});

// Reporte de personalizaciones más populares
router.get('/personalizaciones', (req: Request, res: Response) => {
  const { fechaInicio, fechaFin } = req.query;

  let whereClause = 'WHERE ci.personalizacion IS NOT NULL';
  let params: string[] = [];

  if (fechaInicio && fechaFin) {
    whereClause += ' AND DATE(f.fecha_creacion) BETWEEN ? AND ?';
    params.push(fechaInicio as string, fechaFin as string);
  }

  const query = `
    SELECT 
      ci.personalizacion,
      COUNT(*) as frecuencia,
      p.categoria
    FROM comanda_items ci
    JOIN productos p ON ci.producto_id = p.id
    JOIN comandas c ON ci.comanda_id = c.id
    JOIN facturas f ON c.id = f.comanda_id
    ${whereClause}
    GROUP BY ci.personalizacion, p.categoria
    ORDER BY frecuencia DESC
    LIMIT 50
  `;

  db.all(query, params, (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener personalizaciones:', err);
      return res.status(500).json({ error: 'Error al obtener personalizaciones más populares' });
    }

    // Procesar personalizaciones
    const personalizaciones: any = {
      caldos: {},
      proteinas: {},
      bebidas: {},
      principios: {}
    };

    rows.forEach(row => {
      try {
        const personalizacion = JSON.parse(row.personalizacion);
        
        if (personalizacion.caldo) {
          const nombre = personalizacion.caldo.nombre;
          personalizaciones.caldos[nombre] = (personalizaciones.caldos[nombre] || 0) + row.frecuencia;
        }
        
        if (personalizacion.proteina) {
          const nombre = personalizacion.proteina.nombre;
          personalizaciones.proteinas[nombre] = (personalizaciones.proteinas[nombre] || 0) + row.frecuencia;
        }
        
        if (personalizacion.bebida) {
          const nombre = personalizacion.bebida.nombre;
          personalizaciones.bebidas[nombre] = (personalizaciones.bebidas[nombre] || 0) + row.frecuencia;
        }
        
        if (personalizacion.principio) {
          const nombre = personalizacion.principio.nombre;
          personalizaciones.principios[nombre] = (personalizaciones.principios[nombre] || 0) + row.frecuencia;
        }
      } catch (e) {
        console.warn('Error parsing personalization:', row.personalizacion);
      }
    });

    // Convertir a arrays ordenados
    const resultado = {
      caldos_mas_pedidos: Object.entries(personalizaciones.caldos)
        .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
        .sort((a: any, b: any) => b.frecuencia - a.frecuencia),
      
      proteinas_mas_pedidas: Object.entries(personalizaciones.proteinas)
        .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
        .sort((a: any, b: any) => b.frecuencia - a.frecuencia),
      
      bebidas_mas_pedidas: Object.entries(personalizaciones.bebidas)
        .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
        .sort((a: any, b: any) => b.frecuencia - a.frecuencia),
      
      principios_mas_pedidos: Object.entries(personalizaciones.principios)
        .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
        .sort((a: any, b: any) => b.frecuencia - a.frecuencia)
    };

    res.json(resultado);
  });
});

export default router;
