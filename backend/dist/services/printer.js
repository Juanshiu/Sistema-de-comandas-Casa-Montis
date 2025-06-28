"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imprimirFactura = exports.imprimirComanda = void 0;
const init_1 = require("../database/init");
// Función para obtener datos completos de una comanda
const obtenerComandaCompleta = (comandaId) => {
    return new Promise((resolve, reject) => {
        const comandaQuery = `
      SELECT 
        c.*,
        m.numero as mesa_numero,
        m.capacidad as mesa_capacidad
      FROM comandas c
      JOIN mesas m ON c.mesa_id = m.id
      WHERE c.id = ?
    `;
        init_1.db.get(comandaQuery, [comandaId], (err, comandaRow) => {
            if (err) {
                reject(err);
                return;
            }
            if (!comandaRow) {
                reject(new Error('Comanda no encontrada'));
                return;
            }
            const itemsQuery = `
        SELECT 
          ci.*,
          p.nombre as producto_nombre,
          p.categoria as producto_categoria
        FROM comanda_items ci
        JOIN productos p ON ci.producto_id = p.id
        WHERE ci.comanda_id = ?
      `;
            init_1.db.all(itemsQuery, [comandaId], (err, itemsRows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const comanda = {
                    ...comandaRow,
                    items: itemsRows
                };
                resolve(comanda);
            });
        });
    });
};
// Función para formatear la fecha
const formatearFecha = (fecha) => {
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(fecha);
};
// Función para imprimir comanda (por ahora en consola)
const imprimirComanda = async (comandaId) => {
    try {
        const comanda = await obtenerComandaCompleta(comandaId);
        imprimirEnConsola(comanda);
    }
    catch (error) {
        console.error('Error al obtener datos de comanda:', error);
        throw error;
    }
};
exports.imprimirComanda = imprimirComanda;
// Función para imprimir factura (por ahora en consola)
const imprimirFactura = async (comandaId) => {
    try {
        const comanda = await obtenerComandaCompleta(comandaId);
        imprimirFacturaEnConsola(comanda);
    }
    catch (error) {
        console.error('Error al imprimir factura:', error);
        throw error;
    }
};
exports.imprimirFactura = imprimirFactura;
// Función para imprimir en consola (modo desarrollo)
const imprimirEnConsola = (comanda) => {
    console.log('\n' + '='.repeat(50));
    console.log('                 CASA MONTIS');
    console.log('               COMANDA DE COCINA');
    console.log('='.repeat(50));
    console.log(`Mesa: ${comanda.mesa_numero}`);
    console.log(`Fecha: ${formatearFecha(new Date(comanda.fecha_creacion))}`);
    console.log(`Mesero: ${comanda.mesero}`);
    console.log(`Comanda: ${comanda.id.substring(0, 8)}`);
    console.log('='.repeat(50));
    console.log('ITEMS:');
    console.log('-'.repeat(50));
    comanda.items.forEach((item) => {
        console.log(`${item.cantidad}x ${item.producto_nombre}`);
        if (item.observaciones) {
            console.log(`   📝 Obs: ${item.observaciones}`);
        }
    });
    console.log('-'.repeat(50));
    console.log(`💰 Total: $${comanda.total.toLocaleString('es-CO')}`);
    if (comanda.observaciones_generales) {
        console.log('='.repeat(50));
        console.log('📋 OBSERVACIONES GENERALES:');
        console.log(comanda.observaciones_generales);
    }
    console.log('='.repeat(50));
    console.log('✅ Comanda enviada a cocina');
    console.log('='.repeat(50) + '\n');
};
const imprimirFacturaEnConsola = (comanda) => {
    console.log('\n' + '='.repeat(50));
    console.log('                 CASA MONTIS');
    console.log('                   FACTURA');
    console.log('='.repeat(50));
    console.log(`Mesa: ${comanda.mesa_numero}`);
    console.log(`Fecha: ${formatearFecha(new Date(comanda.fecha_creacion))}`);
    console.log(`Atendido por: ${comanda.mesero}`);
    console.log(`Factura: ${comanda.id.substring(0, 8)}`);
    console.log('='.repeat(50));
    console.log('DESCRIPCION                    CANT    VALOR');
    console.log('-'.repeat(50));
    comanda.items.forEach((item) => {
        const nombre = item.producto_nombre.substring(0, 30).padEnd(30);
        const cantidad = item.cantidad.toString().padStart(4);
        const valor = `$${item.subtotal.toLocaleString('es-CO')}`.padStart(10);
        console.log(`${nombre} ${cantidad} ${valor}`);
    });
    console.log('-'.repeat(50));
    console.log(`SUBTOTAL:                           $${comanda.subtotal.toLocaleString('es-CO')}`);
    console.log(`TOTAL:                              $${comanda.total.toLocaleString('es-CO')}`);
    console.log('='.repeat(50));
    console.log('               ¡GRACIAS POR SU VISITA!');
    console.log('                  Vuelva pronto');
    console.log('='.repeat(50) + '\n');
};
//# sourceMappingURL=printer.js.map