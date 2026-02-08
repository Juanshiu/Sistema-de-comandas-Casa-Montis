import { MesaRepository, NewMesa, MesaUpdate } from '../repositories/mesaRepository';
import { SalonRepository } from '../repositories/salonRepository';
import { db } from '../database/database';

const mesaRepository = new MesaRepository();
const salonRepository = new SalonRepository();

export class MesaService {
  /**
   * Verificar límites de licencia antes de crear mesa
   */
  private async verificarLimitesLicencia(empresaId: string): Promise<void> {
    // Obtener licencia activa
    const licencia = await db
      .selectFrom('licencias')
      .select(['max_mesas'])
      .where('empresa_id', '=', empresaId)
      .where('estado', 'in', ['activo', 'prueba'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    const maxMesas = licencia?.max_mesas || 20; // Default básico

    // Contar mesas activas actuales
    const resultado = await db
      .selectFrom('mesas')
      .select(db.fn.count<number>('id').as('count'))
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .executeTakeFirst();

    const mesasActuales = Number(resultado?.count || 0);

    if (mesasActuales >= maxMesas) {
      throw new Error(`Límite de mesas alcanzado (${maxMesas}). Actualiza tu plan para agregar más mesas.`);
    }
  }

  async listarMesas(empresaId: string) {
    return await mesaRepository.findAllByEmpresa(empresaId);
  }

  async obtenerMesa(id: string, empresaId: string) {
    const mesa = await mesaRepository.findById(id, empresaId);
    if (!mesa) throw new Error('Mesa no encontrada');
    return mesa;
  }

  async crearMesa(empresaId: string, data: any) {
    // ✅ Verificar límites de licencia antes de crear
    await this.verificarLimitesLicencia(empresaId);

    if (!data.numero || !data.salon_id) {
      throw new Error('Número y salón son requeridos');
    }

    // Validar que el salón pertenezca a la empresa
    const salon = await salonRepository.findById(data.salon_id, empresaId);
    if (!salon) throw new Error('El salón especificado no existe o no pertenece a la empresa');

    const nueva: NewMesa = {
      empresa_id: empresaId,
      salon_id: data.salon_id,
      numero: String(data.numero),
      capacidad: data.capacidad || 4,
      tipo: data.tipo || 'rect',
      x: data.x || 0,
      y: data.y || 0,
      width: data.width || 60,
      height: data.height || 60,
      activo: data.activo !== undefined ? data.activo : true,
      ocupada: false
    };

    return await mesaRepository.create(nueva);
  }

  async actualizarMesa(id: string, empresaId: string, data: any) {
    const update: MesaUpdate = {};
    if (data.numero) update.numero = String(data.numero);
    if (data.capacidad) update.capacidad = data.capacidad;
    if (data.tipo) update.tipo = data.tipo;
    if (data.x !== undefined) update.x = data.x;
    if (data.y !== undefined) update.y = data.y;
    if (data.activo !== undefined) update.activo = data.activo;
    
    // Si cambia de salón, validar
    if (data.salon_id) {
      const salon = await salonRepository.findById(data.salon_id, empresaId);
      if (!salon) throw new Error('El salón especificado no existe o no pertenece a la empresa');
      update.salon_id = data.salon_id;
    }

    const actualizada = await mesaRepository.update(id, empresaId, update);
    if (!actualizada) throw new Error('Mesa no encontrada');
    return actualizada;
  }

  async eliminarMesa(id: string, empresaId: string) {
    return await mesaRepository.delete(id, empresaId);
  }
}
