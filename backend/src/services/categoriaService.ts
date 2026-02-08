import { CategoriaRepository, NewCategoria, CategoriaUpdate } from '../repositories/categoriaRepository';

const categoriaRepository = new CategoriaRepository();

export class CategoriaService {
  async listarCategorias(empresaId: string, soloActivas = false) {
    return await categoriaRepository.findAllByEmpresa(empresaId, soloActivas);
  }

  async obtenerCategoria(id: string, empresaId: string) {
    const categoria = await categoriaRepository.findById(id, empresaId);
    if (!categoria) throw new Error('Categoría no encontrada');
    return categoria;
  }

  async crearCategoria(empresaId: string, data: any) {
    if (!data.nombre) throw new Error('El nombre es requerido');

    // Verificar duplicado
    // En el legacy normalizaban el nombre, aquí podemos hacer lo mismo o dejarlo libre.
    // Usaremos normalización simple.
    const nombreNormalizado = data.nombre.trim();

    // Validar si existe (opcional, pero buena práctica)
    // El repo busca por nombre exacto.
    // const existe = await categoriaRepository.findByNombre(nombreNormalizado, empresaId);
    // if (existe) throw new Error('Ya existe una categoría con ese nombre');

    const nueva: NewCategoria = {
      empresa_id: empresaId,
      nombre: nombreNormalizado,
      orden: data.orden || 0,
      activo: data.activo !== undefined ? data.activo : true
    };

    return await categoriaRepository.create(nueva);
  }

  async actualizarCategoria(id: string, empresaId: string, data: any) {
    const update: CategoriaUpdate = {};
    if (data.nombre) update.nombre = data.nombre.trim();
    if (data.orden !== undefined) update.orden = data.orden;
    if (data.activo !== undefined) update.activo = data.activo;

    const actualizada = await categoriaRepository.update(id, empresaId, update);
    if (!actualizada) throw new Error('Categoría no encontrada');
    return actualizada;
  }

  async eliminarCategoria(id: string, empresaId: string) {
    // TODO: Verificar si hay productos asociados antes de borrar
    return await categoriaRepository.delete(id, empresaId);
  }
}
