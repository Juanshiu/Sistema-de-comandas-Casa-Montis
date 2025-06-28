"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imprimirFactura = exports.imprimirComanda = void 0;
const imprimirComanda = (comanda) => {
    try {
        console.log('\n='.repeat(50));
        console.log('           CASA MONTIS');
        console.log('          NUEVA COMANDA');
        console.log('='.repeat(50));
        console.log(`ID: ${comanda.id}`);
        console.log(`Fecha: ${comanda.fecha_creacion?.toLocaleString('es-CO')}`);
        console.log(`Mesero: ${comanda.mesero}`);
        // Mostrar información de mesas
        if (comanda.mesas && comanda.mesas.length > 0) {
            console.log(`Mesa(s): ${comanda.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}`);
            console.log(`Capacidad total: ${comanda.mesas.reduce((sum, mesa) => sum + mesa.capacidad, 0)} personas`);
        }
        console.log('-'.repeat(50));
        // Mostrar items
        if (comanda.items && comanda.items.length > 0) {
            console.log('PRODUCTOS:');
            comanda.items.forEach((item) => {
                console.log(`${item.cantidad}x ${item.producto?.nombre || 'Producto desconocido'}`);
                console.log(`   $${item.precio_unitario.toLocaleString('es-CO')} c/u = $${item.subtotal.toLocaleString('es-CO')}`);
                if (item.personalizacion) {
                    console.log('   Personalización:');
                    const personalizacion = typeof item.personalizacion === 'string'
                        ? JSON.parse(item.personalizacion)
                        : item.personalizacion;
                    if (personalizacion.caldo) {
                        console.log(`     Caldo: ${personalizacion.caldo.nombre}`);
                    }
                    if (personalizacion.principio) {
                        console.log(`     Principio: ${personalizacion.principio.nombre}`);
                    }
                    if (personalizacion.proteina) {
                        console.log(`     Proteína: ${personalizacion.proteina.nombre}`);
                    }
                    if (personalizacion.bebida) {
                        console.log(`     Bebida: ${personalizacion.bebida.nombre}`);
                    }
                }
                if (item.observaciones) {
                    console.log(`   Observaciones: ${item.observaciones}`);
                }
                console.log('');
            });
        }
        console.log('-'.repeat(50));
        console.log(`Subtotal: $${comanda.subtotal.toLocaleString('es-CO')}`);
        console.log(`TOTAL: $${comanda.total.toLocaleString('es-CO')}`);
        if (comanda.observaciones_generales) {
            console.log(`\nObservaciones generales: ${comanda.observaciones_generales}`);
        }
        console.log('='.repeat(50));
        console.log('');
    }
    catch (error) {
        console.error('Error al imprimir comanda:', error);
    }
};
exports.imprimirComanda = imprimirComanda;
const imprimirFactura = (factura) => {
    try {
        console.log('\n='.repeat(50));
        console.log('           CASA MONTIS');
        console.log('            FACTURA');
        console.log('='.repeat(50));
        console.log(`ID Factura: ${factura.id}`);
        console.log(`ID Comanda: ${factura.comanda_id}`);
        console.log(`Fecha: ${factura.fecha_creacion?.toLocaleString('es-CO')}`);
        console.log(`Cajero: ${factura.cajero}`);
        console.log(`Método de pago: ${factura.metodo_pago.toUpperCase()}`);
        // Mostrar información de mesas
        if (factura.mesas && factura.mesas.length > 0) {
            console.log(`Mesa(s): ${factura.mesas.map((m) => `${m.salon} - ${m.numero}`).join(', ')}`);
        }
        console.log('-'.repeat(50));
        // Mostrar items
        if (factura.items && factura.items.length > 0) {
            console.log('PRODUCTOS:');
            factura.items.forEach((item) => {
                console.log(`${item.cantidad}x ${item.producto?.nombre || 'Producto desconocido'}`);
                console.log(`   $${item.precio_unitario.toLocaleString('es-CO')} c/u = $${item.subtotal.toLocaleString('es-CO')}`);
                console.log('');
            });
        }
        console.log('-'.repeat(50));
        console.log(`Subtotal: $${factura.subtotal.toLocaleString('es-CO')}`);
        console.log(`TOTAL: $${factura.total.toLocaleString('es-CO')}`);
        console.log('='.repeat(50));
        console.log('           GRACIAS POR SU VISITA');
        console.log('='.repeat(50));
        console.log('');
    }
    catch (error) {
        console.error('Error al imprimir factura:', error);
    }
};
exports.imprimirFactura = imprimirFactura;
//# sourceMappingURL=printer-nuevo.js.map