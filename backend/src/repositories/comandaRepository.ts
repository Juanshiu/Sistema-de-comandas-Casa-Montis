import { db } from '../database/database';
import { Insertable, Selectable, Updateable, sql } from 'kysely';
import { ComandasTable, ComandaItemsTable, ComandaMesasTable } from '../database/types';

export type Comanda = Selectable<ComandasTable>;
export type NewComanda = Insertable<ComandasTable>;
export type ComandaUpdate = Updateable<ComandasTable>;
export type NewComandaItem = Insertable<ComandaItemsTable>;
export type NewComandaMesa = Insertable<ComandaMesasTable>;

export interface ComandaWithDetails extends Comanda {
  mesas: any[];
  items: any[];
  usuario_nombre?: string;
}

export class ComandaRepository {
  async findById(id: string, empresaId: string): Promise<ComandaWithDetails | undefined> {
    const comanda = await db.selectFrom('comandas')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (!comanda) return undefined;

    const mesas = await db.selectFrom('comanda_mesas')
      .innerJoin('mesas', 'mesas.id', 'comanda_mesas.mesa_id')
      .leftJoin('salones', 'salones.id', 'mesas.salon_id')
      .select([
        'mesas.id', 'mesas.numero', 'mesas.salon_id', 
        'salones.nombre as salon_nombre'
      ])
      .where('comanda_mesas.comanda_id', '=', id)
      .execute();

    const items = await db.selectFrom('comanda_items')
      .leftJoin('productos', 'productos.id', 'comanda_items.producto_id')
      .select([
        'comanda_items.id',
        'comanda_items.comanda_id',
        'comanda_items.producto_id',
        'comanda_items.cantidad',
        'comanda_items.precio_unitario',
        'comanda_items.total',
        'comanda_items.observaciones',
        'comanda_items.personalizacion',
        'productos.nombre as producto_nombre',
        'productos.categoria_id as producto_categoria',
        'productos.precio as producto_precio_base'
      ])
      .where('comanda_items.comanda_id', '=', id)
      .execute();

    // Fetch user info optionally
    let usuario_nombre = 'Desconocido';
    if (comanda.usuario_id) {
       const user = await db.selectFrom('usuarios')
         .select('nombre')
         .where('id', '=', comanda.usuario_id)
         .executeTakeFirst();
       if (user) usuario_nombre = user.nombre;
    }

    return {
      ...comanda,
      mesas,
      items: items.map(item => ({
        ...item,
        personalizacion: item.personalizacion
      })),
      usuario_nombre
    };
  }

  async findAllByEmpresa(empresaId: string, estado?: string, fecha?: string): Promise<any[]> {
    let query = db.selectFrom('comandas')
      .leftJoin('usuarios', 'usuarios.id', 'comandas.usuario_id')
      .select([
        'comandas.id', 'comandas.estado', 'comandas.total', 
        'comandas.fecha_apertura', 'comandas.tipo_pedido', 'comandas.cliente_nombre',
        'comandas.datos_cliente',
        'usuarios.nombre as usuario_nombre'
      ])
      .where('comandas.empresa_id', '=', empresaId)
      .orderBy('comandas.fecha_apertura', 'desc');

    if (estado) {
      if (estado === 'activa') {
         query = query.where('comandas.estado', 'in', ['pendiente', 'preparando', 'lista']);
      } else {
         query = query.where('comandas.estado', '=', estado);
      }
    }

    // TODO: Filtro por fecha si es necesario

    const partialComandas = await query.execute();

    // Fetch Tables and Items for each comanda
    const result = await Promise.all(partialComandas.map(async (c) => {
      const mesas = await db.selectFrom('comanda_mesas')
        .innerJoin('mesas', 'mesas.id', 'comanda_mesas.mesa_id')
        .leftJoin('salones', 'salones.id', 'mesas.salon_id')
        .select([
          'mesas.id', 
          'mesas.numero', 
          'mesas.salon_id',
          'salones.nombre as salon'
        ])
        .where('comanda_mesas.comanda_id', '=', c.id)
        .execute();

      const items = await db.selectFrom('comanda_items')
        .leftJoin('productos', 'productos.id', 'comanda_items.producto_id')
        .select([
          'comanda_items.id',
          'comanda_items.cantidad',
          'comanda_items.precio_unitario',
          'comanda_items.total',
          'comanda_items.observaciones',
          'comanda_items.personalizacion',
          'productos.nombre as producto_nombre',
          'productos.id as producto_id'
        ])
        .where('comanda_items.comanda_id', '=', c.id)
        .execute();
      
      const datosCliente = typeof (c as any).datos_cliente === 'string'
        ? (() => {
            try {
              return JSON.parse((c as any).datos_cliente);
            } catch {
              return null;
            }
          })()
        : (c as any).datos_cliente;

      return {
        ...c,
        datos_cliente: datosCliente,
        mesas: mesas.map(m => ({
          id: m.id,
          numero: m.numero,
          salon_id: m.salon_id,
          salon: m.salon || 'Sin Salón'
        })),
        items: items.map(i => ({
          id: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.total, // Alias total as subtotal for frontend
          total: i.total,
          observaciones: i.observaciones,
          personalizacion: i.personalizacion,
          producto: {
            id: i.producto_id,
            nombre: i.producto_nombre
          }
        }))
      };
    }));

    return result;
  }

  async create(
    empresaId: string, 
    comanda: NewComanda, 
    items: NewComandaItem[], 
    mesaIds: string[],
    externalTrx?: any // Using any to avoid strict type import issues in this file quickly, but ideally Transaction<DB>
  ): Promise<string> {
    const runInTrx = async (trx: any) => {
      // 1. Crear Comanda Header
      const createdComanda = await trx.insertInto('comandas')
        .values(comanda)
        .returning('id')
        .executeTakeFirstOrThrow();
      
      const comandaId = createdComanda.id;

      // 2. Crear Items
      if (items.length > 0) {
        const itemsWithId = items.map((it: any) => ({ ...it, comanda_id: comandaId }));
        await trx.insertInto('comanda_items')
          .values(itemsWithId)
          .execute();
      }

      // 3. Asociar Mesas
      if (mesaIds.length > 0) {
        const mesaAssociations: NewComandaMesa[] = mesaIds.map(mid => ({
          comanda_id: comandaId,
          mesa_id: mid,
          empresa_id: empresaId
        }));
        await trx.insertInto('comanda_mesas')
          .values(mesaAssociations)
          .execute();

        // 4. Update Mesas to Occupied
        await trx.updateTable('mesas')
          .set({ ocupada: true }) // Boolean true for postgres
          .where('id', 'in', mesaIds)
          .where('empresa_id', '=', empresaId)
          .execute();
      }

      return comandaId;
    };

    if (externalTrx) {
        return await runInTrx(externalTrx);
    } else {
        return await db.transaction().execute(runInTrx);
    }
  }

  async updateEstado(id: string, empresaId: string, estado: string): Promise<boolean> {
      return await db.transaction().execute(async (trx) => {
        const result = await trx.updateTable('comandas')
          .set({ 
              estado, 
              mesas: undefined // Hack to fix type error if NewComanda had mesas? No, ComandaUpdate doesn't have it.
          } as any)
          .where('id', '=', id)
          .where('empresa_id', '=', empresaId)
          .executeTakeFirst();
        
        // Si el estado es 'cancelada', liberar mesas
        if (estado === 'cancelada') {
            const mesas = await trx.selectFrom('comanda_mesas')
                .select('mesa_id')
                .where('comanda_id', '=', id)
                .execute();
            
            if (mesas.length > 0) {
                const mesaIds = mesas.map(m => m.mesa_id);
                await trx.updateTable('mesas')
                    .set({ ocupada: false })
                    .where('id', 'in', mesaIds)
                    .where('empresa_id', '=', empresaId)
                    .execute();
            }
        }

        return Number(result.numUpdatedRows) > 0;
      });
  }

  async cambiarMesa(id: string, empresaId: string, newMesaIds: string[]): Promise<void> {
    await db.transaction().execute(async (trx) => {
        // 1. Obtener mesas actuales
        const currentMesas = await trx.selectFrom('comanda_mesas')
            .select('mesa_id')
            .where('comanda_id', '=', id)
            .execute();
        
        const currentMesaIds = currentMesas.map(m => m.mesa_id);

        // 2. Liberar mesas actuales
        if (currentMesaIds.length > 0) {
            await trx.updateTable('mesas')
                .set({ ocupada: false })
                .where('id', 'in', currentMesaIds)
                .where('empresa_id', '=', empresaId)
                .execute();
            
            // Eliminar relaciones
            await trx.deleteFrom('comanda_mesas')
                .where('comanda_id', '=', id)
                .execute();
        }

        // 3. Asociar nuevas mesas
        if (newMesaIds.length > 0) {
            const mesaAssociations = newMesaIds.map(mid => ({
                comanda_id: id,
                mesa_id: mid,
                empresa_id: empresaId
            }));
            await trx.insertInto('comanda_mesas')
                .values(mesaAssociations)
                .execute();

            // Ocupar nuevas mesas
            await trx.updateTable('mesas')
                .set({ ocupada: true })
                .where('id', 'in', newMesaIds)
                .where('empresa_id', '=', empresaId)
                .execute();
        }
    });
  }

  async combinarComandas(targetId: string, sourceId: string, empresaId: string): Promise<void> {
    await db.transaction().execute(async (trx) => {
        // 1. Obtener items de source
        const sourceItems = await trx.selectFrom('comanda_items')
            .selectAll()
            .where('comanda_id', '=', sourceId)
            .execute();

        // 2. Mover items a target
        // Opción A: Update comanda_id (más rápido)
        // Opción B: Insert new, delete old (más limpio si hay conflictos de IDs, pero IDs son UUIDs)
        // Vamos con Update
        if (sourceItems.length > 0) {
            await trx.updateTable('comanda_items')
                .set({ comanda_id: targetId })
                .where('comanda_id', '=', sourceId)
                .execute();
        }

        // 3. Recalcular total de target
        // Obtener total actual de source comanda para sumar (o recalcular todo)
        const sourceComanda = await trx.selectFrom('comandas')
            .select('total')
            .where('id', '=', sourceId)
            .executeTakeFirst();
        
        if (sourceComanda) {
            // Sumar al target (simplificado, idealmente recalcular desde items)
            // Mejor recalcular todo el target desde items
            const allItems = await trx.selectFrom('comanda_items')
                .select('total')
                .where('comanda_id', '=', targetId)
                .execute();
            
            const newTotal = allItems.reduce((sum, item) => sum + item.total, 0);

            await trx.updateTable('comandas')
                .set({ 
                    total: newTotal,
                    subtotal: newTotal // Asumiendo impuestos simples
                })
                .where('id', '=', targetId)
                .execute();
        }

        // 4. Liberar mesas de source
        const sourceMesas = await trx.selectFrom('comanda_mesas')
            .select('mesa_id')
            .where('comanda_id', '=', sourceId)
            .execute();
        
        if (sourceMesas.length > 0) {
            const mesaIds = sourceMesas.map(m => m.mesa_id);
            await trx.updateTable('mesas')
                .set({ ocupada: false })
                .where('id', 'in', mesaIds)
                .where('empresa_id', '=', empresaId)
                .execute();
            
            await trx.deleteFrom('comanda_mesas')
                .where('comanda_id', '=', sourceId)
                .execute();
        }

        // 5. Marcar source como 'cancelada' o 'fusionada' (o eliminar)
        // Vamos a eliminarla lógicamente o marcarla
        // Como el historial filtra por pagada/cerrada/cancelada, 'fusionada' podría ser útil o simplemente eliminarla
        // Si la eliminamos, perdemos rastro. Mejor estado 'fusionada' si la DB lo permite, o 'cancelada' con nota.
        // Pero el frontend espera estados específicos.
        // Vamos a eliminarla físicamente para evitar duplicados en listas activas, ya que sus items se movieron.
        // Ojo: Si eliminamos, cuidado con FKs. Ya movimos items y borramos comanda_mesas.
        await trx.deleteFrom('comandas')
            .where('id', '=', sourceId)
            .where('empresa_id', '=', empresaId)
            .execute();
    });
  }

  async cerrarComanda(id: string, empresaId: string, pagoData: { metodo: string, monto: number, cambio: number }): Promise<void> {
    await db.transaction().execute(async (trx) => {
      // 1. Update Comanda
        await trx.updateTable('comandas')
        .set({
            estado: 'pagada', // Or entregada/cerrada logic?
            metodo_pago: pagoData.metodo,
            monto_pagado: pagoData.monto,
            cambio: pagoData.cambio,
            fecha_cierre: new Date() as any // Timestamp cast
        })
        .where('id', '=', id)
        .where('empresa_id', '=', empresaId)
        .execute();

      // 2. Free Mesas
      // Find mesas first
      const mesas = await trx.selectFrom('comanda_mesas')
        .select('mesa_id')
        .where('comanda_id', '=', id)
        .execute();
      
      if (mesas.length > 0) {
         const mesaIds = mesas.map(m => m.mesa_id);
         await trx.updateTable('mesas')
           .set({ ocupada: false })
           .where('id', 'in', mesaIds)
           .execute();
      }
    });
  }

  async findHistorial(empresaId: string, filtros: { desde?: string, hasta?: string, estado?: string, limite?: number }): Promise<any[]> {
    let query = db.selectFrom('comandas')
      .leftJoin('usuarios', 'usuarios.id', 'comandas.usuario_id')
      .select([
        'comandas.id', 'comandas.estado', 'comandas.total', 'comandas.subtotal',
        'comandas.fecha_apertura', 'comandas.fecha_cierre',
        'comandas.tipo_pedido', 'comandas.cliente_nombre', 'comandas.datos_cliente',
        'comandas.metodo_pago', 'comandas.monto_pagado', 'comandas.cambio',
        'usuarios.nombre as usuario_nombre'
      ])
      .where('comandas.empresa_id', '=', empresaId)
      .where('comandas.estado', 'in', ['pagada', 'cerrada', 'cancelada'])
      .orderBy('comandas.fecha_apertura', 'desc'); // Ordenar por fecha de apertura para mantener consistencia

    if (filtros.desde) {
      // Usar fecha_cierre para filtrar (fecha en que se pagó/canceló), no fecha_apertura
      query = query.where('comandas.fecha_cierre', '>=', new Date(filtros.desde) as any);
    }
    if (filtros.hasta) {
      // Usar fecha_cierre para consistencia con reportes
      const hastaDate = new Date(filtros.hasta);
      hastaDate.setHours(23, 59, 59, 999); // Incluir todo el día
      query = query.where('comandas.fecha_cierre', '<=', hastaDate as any);
    }
    if (filtros.estado) {
      query = query.where('comandas.estado', '=', filtros.estado);
    }

    query = query.limit(filtros.limite || 50);

    const comandas = await query.execute();

    // Obtener el total de comandas para calcular números secuenciales
    const totalCount = await db.selectFrom('comandas')
      .select(db.fn.count<number>('id').as('count'))
      .where('comandas.empresa_id', '=', empresaId)
      .where('comandas.estado', 'in', ['pagada', 'cerrada', 'cancelada'])
      .executeTakeFirst();

    const total = Number(totalCount?.count || 0);

    // Agregar info de mesas e items
    const result = await Promise.all(comandas.map(async (c, index) => {
      const mesas = await db.selectFrom('comanda_mesas')
        .innerJoin('mesas', 'mesas.id', 'comanda_mesas.mesa_id')
        .leftJoin('salones', 'salones.id', 'mesas.salon_id')
        .select([
          'mesas.id', 
          'mesas.numero', 
          'mesas.salon_id',
          'salones.nombre as salon'
        ])
        .where('comanda_mesas.comanda_id', '=', c.id)
        .execute();
      
      const items = await db.selectFrom('comanda_items')
        .leftJoin('productos', 'productos.id', 'comanda_items.producto_id')
        .select([
          'comanda_items.id',
          'comanda_items.cantidad',
          'comanda_items.precio_unitario',
          'comanda_items.total',
          'comanda_items.observaciones',
          'comanda_items.personalizacion',
          'productos.nombre as producto_nombre',
          'productos.id as producto_id'
        ])
        .where('comanda_items.comanda_id', '=', c.id)
        .execute();

      return {
        ...c,
        fecha_creacion: c.fecha_apertura, // Mapear para compatibilidad con frontend
        numero_comanda: total - index, // Número secuencial basado en orden cronológico
        mesas: mesas.map(m => ({
          id: m.id,
          numero: m.numero,
          salon_id: m.salon_id,
          salon: m.salon || 'Sin Salón'
        })),
        items: items.map(i => ({
          id: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.total,
          total: i.total,
          observaciones: i.observaciones,
          personalizacion: i.personalizacion,
          producto: {
            id: i.producto_id,
            nombre: i.producto_nombre
          }
        }))
      };
    }));

    return result;
  }
}
