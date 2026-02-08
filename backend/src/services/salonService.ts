import { SalonRepository, NewSalon, SalonUpdate } from '../repositories/salonRepository';

const salonRepository = new SalonRepository();

export class SalonService {
  async listarSalones(empresaId: string) {
    return await salonRepository.findAllByEmpresa(empresaId);
  }

  async obtenerSalon(id: string, empresaId: string) {
    const salon = await salonRepository.findById(id, empresaId);
    if (!salon) throw new Error('Salón no encontrado');
    return salon;
  }

  async crearSalon(empresaId: string, data: any) {
    if (!data.nombre) throw new Error('El nombre es requerido');

    const nuevo: NewSalon = {
      empresa_id: empresaId,
      nombre: data.nombre.trim(),
      activo: data.activo !== undefined ? data.activo : true 
    };

    return await salonRepository.create(nuevo);
  }

  async actualizarSalon(id: string, empresaId: string, data: any) {
    const update: SalonUpdate = {};
    if (data.nombre) update.nombre = data.nombre.trim();
    if (data.activo !== undefined) update.activo = data.activo;

    const actualizado = await salonRepository.update(id, empresaId, update);
    if (!actualizado) throw new Error('Salón no encontrado');
    return actualizado;
  }

  async eliminarSalon(id: string, empresaId: string) {
    // TODO: Comprobar dependencias de mesas antes de borrar
    return await salonRepository.delete(id, empresaId);
  }
}
