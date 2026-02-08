import { db } from '../database/database';
import { Transaction } from 'kysely';
import { Database } from '../database/types'; // FIXED: DB -> Database

export class InventarioService {

  private async getCriticoModo(empresaId: string): Promise<string> {
    // Adapter for new Key-Value config structure
    // We assume there is a row with clave='config_inventario' containing user preferences
    const config = await db.selectFrom('config_sistema')
      .select('valor')
      .where('empresa_id', '=', empresaId)
      .where('clave', '=', 'config_inventario')
      .executeTakeFirst();
    
    // Cast json to expected shape
    const settings = config?.valor as any;
    const modo = (settings?.critico_modo || '').toUpperCase();

    if (modo === 'BAJO') return 'BAJO';
    if (modo === 'NUNCA' || modo === 'SOLO_AVISAR') return 'NUNCA';
    if (modo === 'BLOQUEAR') return 'CRITICO';
    if (modo === 'CRITICO') return 'CRITICO';
    return 'CRITICO'; // Default strict
  }

  // ===== DECREMENTAR INVENTARIO DE INSUMOS =====
  async processIngredientesConsumption(
    items: any[], 
    empresaId: string, 
    trx: Transaction<Database>,
    contexto?: { comandaId?: string; usuarioId?: string }
  ): Promise<Set<string>> {
    const productosConReceta = new Set<string>();
    const modoCritico = await this.getCriticoModo(empresaId);

    for (const item of items) {
      // 1. Obtener receta del producto
      const receta = await trx
        .selectFrom('producto_insumos')
        .innerJoin('insumos', 'insumos.id', 'producto_insumos.insumo_id')
        .select(['insumos.id', 'insumos.nombre', 'insumos.unidad_medida', 'insumos.stock_actual', 'producto_insumos.cantidad as cant_receta'])
        .where('producto_insumos.producto_id', '=', item.producto_id)
        .where('producto_insumos.empresa_id', '=', empresaId)
        .execute();

      if (receta.length > 0) {
        productosConReceta.add(item.producto_id);
        
        for (const insumo of receta) {
          const totalConsumo = insumo.cant_receta * item.cantidad;
          
          if (modoCritico === 'CRITICO' && insumo.stock_actual < totalConsumo) {
            throw new Error(`Stock insuficiente para el insumo: ${insumo.nombre}. Requerido: ${totalConsumo}, Disponible: ${insumo.stock_actual}`);
          }

          // Descontar stock
          await trx
            .updateTable('insumos')
            .set((eb) => ({
              stock_actual: eb('stock_actual', '-', totalConsumo)
            }))
            .where('id', '=', insumo.id)
            .where('empresa_id', '=', empresaId)
            .execute();

          // Registrar en historial
          await trx
            .insertInto('historial_inventario')
            .values({
              empresa_id: empresaId,
              insumo_id: insumo.id,
              producto_id: item.producto_id,
              tipo_movimiento: 'consumo',
              cantidad: -totalConsumo,
              motivo: `Consumo por comanda ${contexto?.comandaId || ''}`,
              usuario_id: contexto?.usuarioId || null
            })
            .execute();
          
          await trx
            .insertInto('insumo_historial')
            .values({
              empresa_id: empresaId,
              insumo_id: insumo.id,
              cantidad: -totalConsumo,
              unidad_medida: insumo.unidad_medida,
              producto_id: item.producto_id,
              comanda_id: contexto?.comandaId || null,
              tipo_evento: 'CONSUMO',
              motivo: `Consumo por comanda ${contexto?.comandaId || ''}`.trim(),
              usuario_id: contexto?.usuarioId || null,
              proveedor_id: null
            })
            .execute();
        }
      }

      // 2. Procesar personalizaciones si existen
      if (item.personalizacion) {
        const idsPersonalizacion = this.obtenerIdsPersonalizacion(item.personalizacion);
        if (idsPersonalizacion.length > 0) {
          
          // 2a. Decrementar inventario básico de personalizaciones (si aplica)
          const itemsPerso = await trx
            .selectFrom('items_personalizacion')
            .select(['id', 'nombre', 'usa_inventario', 'cantidad_actual'])
            .where('id', 'in', idsPersonalizacion)
            .where('empresa_id', '=', empresaId)
            .execute();
          
          for (const persoItem of itemsPerso) {
            if (persoItem.usa_inventario && persoItem.cantidad_actual !== null) {
              const cantidadPorItem = item.cantidad; // 1 personalización por item de comanda
              
              if (modoCritico === 'CRITICO' && persoItem.cantidad_actual < cantidadPorItem) {
                throw new Error(`Stock insuficiente para la personalización: ${persoItem.nombre}. Requerido: ${cantidadPorItem}, Disponible: ${persoItem.cantidad_actual}`);
              }

              await trx
                .updateTable('items_personalizacion')
                .set((eb) => ({
                  cantidad_actual: eb('cantidad_actual', '-', cantidadPorItem)
                }))
                .where('id', '=', persoItem.id)
                .where('empresa_id', '=', empresaId)
                .execute();

              // Registrar en historial
              await trx
                .insertInto('historial_inventario')
                .values({
                  empresa_id: empresaId,
                  insumo_id: null,
                  producto_id: item.producto_id,
                  tipo_movimiento: 'consumo',
                  cantidad: -cantidadPorItem,
                  motivo: `Consumo de personalización "${persoItem.nombre}" en comanda ${contexto?.comandaId || ''}`,
                  usuario_id: contexto?.usuarioId || null
                })
                .execute();
            }
          }

          // 2b. Decrementar insumos de las personalizaciones (recetas)
          const recetaPerso = await trx
            .selectFrom('personalizacion_insumos')
            .innerJoin('insumos', 'insumos.id', 'personalizacion_insumos.insumo_id')
            .select(['insumos.id', 'insumos.nombre', 'insumos.unidad_medida', 'insumos.stock_actual', 'personalizacion_insumos.cantidad as cant_receta'])
            .where('personalizacion_insumos.item_personalizacion_id', 'in', idsPersonalizacion)
            .where('personalizacion_insumos.empresa_id', '=', empresaId)
            .execute();

          for (const insumo of recetaPerso) {
            const totalConsumo = insumo.cant_receta * item.cantidad;

            if (modoCritico === 'CRITICO' && insumo.stock_actual < totalConsumo) {
              throw new Error(`Stock insuficiente para el insumo de personalización: ${insumo.nombre}. Requerido: ${totalConsumo}, Disponible: ${insumo.stock_actual}`);
            }

            await trx
              .updateTable('insumos')
              .set((eb) => ({
                stock_actual: eb('stock_actual', '-', totalConsumo)
              }))
              .where('id', '=', insumo.id)
              .where('empresa_id', '=', empresaId)
              .execute();

            await trx
              .insertInto('historial_inventario')
              .values({
                empresa_id: empresaId,
                insumo_id: insumo.id,
                producto_id: item.producto_id,
                tipo_movimiento: 'consumo',
                cantidad: -totalConsumo,
                motivo: `Consumo por personalización en comanda ${contexto?.comandaId || ''}`,
                usuario_id: contexto?.usuarioId || null
              })
              .execute();
            
            await trx
              .insertInto('insumo_historial')
              .values({
                empresa_id: empresaId,
                insumo_id: insumo.id,
                cantidad: -totalConsumo,
                unidad_medida: insumo.unidad_medida,
                producto_id: item.producto_id,
                comanda_id: contexto?.comandaId || null,
                tipo_evento: 'CONSUMO',
                motivo: `Consumo por personalización en comanda ${contexto?.comandaId || ''}`.trim(),
                usuario_id: contexto?.usuarioId || null,
                proveedor_id: null
              })
              .execute();
          }
        }
      }
    }

    return productosConReceta;
  }

  // ===== DECREMENTAR INVENTARIO DE PRODUCTOS =====
  async processProductosConsumption(
      items: any[], 
      productosExcluidos: Set<string>, // FIXED: number -> string
      empresaId: string, 
      trx: Transaction<Database> // FIXED: DB -> Database
  ): Promise<void> {
      const modoCritico = await this.getCriticoModo(empresaId);

      for (const item of items) {
          if (productosExcluidos.has(item.producto_id)) continue;

          const producto = await trx
              .selectFrom('productos')
              .select(['id', 'nombre', 'usa_inventario', 'stock', 'cantidad_actual'])
              .where('id', '=', item.producto_id)
              .where('empresa_id', '=', empresaId)
              .executeTakeFirst();

          if (producto && producto.usa_inventario && producto.cantidad_actual !== null) {
              const totalConsumo = item.cantidad;
              
              if (modoCritico === 'CRITICO' && producto.cantidad_actual < totalConsumo) {
                  throw new Error(`Stock insuficiente para el producto: ${producto.nombre}. Requerido: ${totalConsumo}, Disponible: ${producto.cantidad_actual}`);
              }

              // Decrementar tanto cantidad_actual (nuevo sistema) como stock (legacy)
              await trx
                  .updateTable('productos')
                  .set((eb) => ({
                    cantidad_actual: eb('cantidad_actual', '-', totalConsumo),
                    stock: eb('stock', '-', totalConsumo)
                  }))
                  .where('id', '=', item.producto_id)
                  .where('empresa_id', '=', empresaId)
                  .execute();

              // Registrar en historial (insumo_id: null indica producto directo)
              await trx
                  .insertInto('historial_inventario')
                  .values({
                      empresa_id: empresaId,
                      insumo_id: null,
                      producto_id: item.producto_id,
                      tipo_movimiento: 'consumo',
                      cantidad: -totalConsumo,
                      motivo: `Consumo directo de producto`,
                      usuario_id: null
                  })
                  .execute();
          }
      }
  }

  // ===== AJUSTE MANUAL / COMPRA DE INVENTARIO =====
  async updateStock(
    empresaId: string,
    insumoId: string | null,
    productoId: string | null,
    cantidad: number,
    tipo: 'ajuste' | 'compra' | 'devolucion' | 'consumo',
    motivo: string,
    usuarioId: string | null
  ) {
    return await db.transaction().execute(async (trx) => {
      if (insumoId) {
        await trx
          .updateTable('insumos')
          .set((eb) => ({
            stock_actual: eb('stock_actual', '+', cantidad)
          }))
          .where('id', '=', insumoId)
          .where('empresa_id', '=', empresaId)
          .execute();
      } else if (productoId) {
        // Actualizar tanto cantidad_actual (nuevo sistema) como stock (legacy)
        await trx
          .updateTable('productos')
          .set((eb) => ({
            cantidad_actual: eb('cantidad_actual', '+', cantidad),
            stock: eb('stock', '+', cantidad)
          }))
          .where('id', '=', productoId)
          .where('empresa_id', '=', empresaId)
          .execute();
      }

      await trx
        .insertInto('historial_inventario')
        .values({
          empresa_id: empresaId,
          insumo_id: insumoId,
          producto_id: productoId,
          tipo_movimiento: tipo,
          cantidad: cantidad,
          motivo: motivo,
          usuario_id: usuarioId
        })
        .execute();
    });
  }

  private obtenerIdsPersonalizacion(personalizacion: any): string[] {
        if (!personalizacion) return [];
        let p = personalizacion;
        
        // Si viene como string (JSON en DB), parsear
        if (typeof p === 'string') {
            try { p = JSON.parse(p); } catch { return []; }
        }
        
        // Estructura esperada: Array de objetos con 'id' o similar
        // O un objeto con IDs como llaves. 
        // Basado en el esquema anterior, suele ser un array de items elegidos.
        if (Array.isArray(p)) {
            return p.map(item => item.id || item.item_id).filter(id => !!id);
        }
        
        // Si es un objeto de categorías: { "Salsas": { "id": "uuid", "nombre": "BBQ" } }
        if (typeof p === 'object') {
            const ids: string[] = [];
            for (const key in p) {
                if (p[key]?.id) ids.push(p[key].id);
                else if (typeof p[key] === 'string') ids.push(p[key]); // Caso simple
            }
            return ids;
        }

        return []; 
  }
}

