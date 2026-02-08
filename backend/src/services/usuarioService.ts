import bcrypt from 'bcrypt';
import { UsuarioRepository, NewUsuario, UsuarioUpdate } from '../repositories/usuarioRepository';
import { db } from '../database/database';

const usuarioRepository = new UsuarioRepository();

export class UsuarioService {
  
  /**
   * Verificar límites de licencia antes de crear usuario
   */
  private async verificarLimitesLicencia(empresaId: string): Promise<void> {
    // Obtener licencia activa
    const licencia = await db
      .selectFrom('licencias')
      .select(['max_usuarios'])
      .where('empresa_id', '=', empresaId)
      .where('estado', 'in', ['activo', 'prueba'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    const maxUsuarios = licencia?.max_usuarios || 5; // Default básico

    // Contar usuarios activos actuales
    const resultado = await db
      .selectFrom('usuarios')
      .select(db.fn.count<number>('id').as('count'))
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .executeTakeFirst();

    const usuariosActuales = Number(resultado?.count || 0);

    if (usuariosActuales >= maxUsuarios) {
      throw new Error(`Límite de usuarios alcanzado (${maxUsuarios}). Actualiza tu plan para agregar más usuarios.`);
    }
  }

  async listarUsuarios(empresaId: string) {
    return await usuarioRepository.findAllByEmpresa(empresaId);
  }

  async obtenerUsuario(id: string, empresaId: string) {
    const usuario = await usuarioRepository.findByIdAndEmpresa(id, empresaId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    // Remove password hash before returning
    const { password_hash, ...safeUsuario } = usuario;
    return safeUsuario;
  }

  async crearUsuario(empresaId: string, data: any) {
    // ✅ Verificar límites de licencia antes de crear
    await this.verificarLimitesLicencia(empresaId);

    // Compatibilidad: aceptar tanto 'nombre' como 'nombre_completo'
    const nombre = data.nombre || data.nombre_completo;
    
    // Validar datos mínimos - ya no se requiere 'usuario', se usa email para login
    if (!data.email || !data.password || !nombre || !data.rol_id) {
      throw new Error('Faltan campos requeridos: email, password, nombre, rol_id');
    }

    // Validar email único (por empresa para permitir mismo email en diferentes empresas)
    const existe = await usuarioRepository.findByEmailAndEmpresa(data.email, empresaId);
    if (existe) {
      throw new Error('El email ya está registrado en esta empresa');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Generar usuario automáticamente a partir del email (para compatibilidad hacia atrás)
    const usuarioAutoGenerado = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const nuevoUsuario: NewUsuario = {
      empresa_id: empresaId,
      nombre: nombre,
      usuario: usuarioAutoGenerado,
      email: data.email,
      password_hash: hashedPassword,
      rol_id: data.rol_id,
      activo: data.activo !== undefined ? data.activo : true
    };

    const creado = await usuarioRepository.create(nuevoUsuario);
    const { password_hash, ...safeCreado } = creado;
    return safeCreado;
  }

  async actualizarUsuario(id: string, empresaId: string, data: any) {
    // Verificar existencia
    const current = await usuarioRepository.findByIdAndEmpresa(id, empresaId);
    if (!current) throw new Error('Usuario no encontrado');

    // Si cambia el email, validar que no exista otro con ese email en la empresa
    if (data.email && data.email !== current.email) {
      const emailExiste = await usuarioRepository.findByEmailAndEmpresa(data.email, empresaId);
      if (emailExiste && emailExiste.id !== id) {
        throw new Error('El email ya está registrado por otro usuario en esta empresa');
      }
    }

    // Compatibilidad: aceptar tanto 'nombre' como 'nombre_completo'
    const nombre = data.nombre || data.nombre_completo;

    // Si cambia el email, actualizar también el usuario autogenerado
    const usuarioAutoGenerado = data.email ? 
      data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') : 
      undefined;

    const updateData: UsuarioUpdate = {
      nombre: nombre,
      usuario: usuarioAutoGenerado,
      email: data.email,
      rol_id: data.rol_id,
      activo: data.activo,
      updated_at: new Date() as any // Cast temporal para evitar error de tipos Kysely Timestamp
    };

    // Si setea password
    if (data.password && data.password.length >= 6) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    }

    const actualizado = await usuarioRepository.update(id, empresaId, updateData);
    if (!actualizado) throw new Error('No se pudo actualizar');

    const { password_hash, ...safeUpdated } = actualizado;
    return safeUpdated;
  }

  async eliminarUsuario(id: string, empresaId: string) {
    // Evitar auto-borrado? (opcional)
    return await usuarioRepository.delete(id, empresaId);
  }
}
