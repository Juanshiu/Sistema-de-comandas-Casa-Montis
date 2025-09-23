// Script para probar el endpoint del historial directamente
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/casa_montis.db');

console.log('🔍 Probando endpoint del historial...');

// Simular el código del endpoint
const probarHistorial = async (fecha) => {
  try {
    let query = `
      SELECT 
        c.id,
        c.fecha_creacion as fecha,
        c.mesero,
        c.subtotal,
        c.total,
        c.estado,
        c.observaciones_generales,
        GROUP_CONCAT(DISTINCT m.salon || ' - ' || m.numero) as mesas
      FROM comandas c
      LEFT JOIN comanda_mesas cm ON c.id = cm.comanda_id
      LEFT JOIN mesas m ON cm.mesa_id = m.id
    `;
    
    let params = [];
    
    if (fecha) {
      query += ` WHERE DATE(c.fecha_creacion) = ?`;
      params.push(fecha);
    }
    
    query += ` 
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `;
    
    console.log('🔍 Ejecutando query historial:', query);
    console.log('📅 Parámetros:', params);
    
    const comandas = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error en query historial:', err);
          reject(err);
        } else {
          console.log('✅ Comandas encontradas:', rows ? rows.length : 0);
          if (rows && rows.length > 0) {
            console.log('📋 Primera comanda:', rows[0]);
          }
          resolve(rows || []);
        }
      });
    });
    
    if (!comandas || comandas.length === 0) {
      console.log('⚠️  No se encontraron comandas');
      return [];
    }
    
    // Obtener items para la primera comanda como prueba
    if (comandas.length > 0) {
      const primeraComanda = comandas[0];
      console.log('🔍 Obteniendo items para comanda:', primeraComanda.id);
      
      const items = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            ci.id,
            ci.cantidad,
            ci.precio_unitario,
            ci.subtotal,
            ci.observaciones,
            p.nombre as producto_nombre,
            ci.personalizacion
          FROM comanda_items ci
          JOIN productos p ON ci.producto_id = p.id
          WHERE ci.comanda_id = ?
          ORDER BY ci.id
        `, [primeraComanda.id], (err, rows) => {
          if (err) {
            console.error('❌ Error obteniendo items:', err);
            reject(err);
          } else {
            console.log('✅ Items encontrados:', rows ? rows.length : 0);
            if (rows && rows.length > 0) {
              console.log('📋 Primer item:', rows[0]);
            }
            resolve(rows || []);
          }
        });
      });
      
      console.log('📊 Items procesados para primera comanda:', items.length);
    }
    
    console.log('📊 Total comandas procesadas:', comandas.length);
    return comandas;
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    return [];
  }
};

// Probar sin filtro de fecha
probarHistorial().then(() => {
  console.log('✅ Prueba completada');
  db.close();
}).catch(err => {
  console.error('❌ Error en prueba:', err);
  db.close();
});