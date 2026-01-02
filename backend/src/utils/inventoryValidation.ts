/**
 * Utilidades para validación de inventario en el backend
 */

export interface InventoryValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida que las cantidades de inventario sean válidas
 */
export function validateInventoryData(
  usaInventario: boolean,
  cantidadInicial: number | null,
  cantidadActual: number | null,
  isCreating: boolean = false
): InventoryValidationResult {
  // Si no usa inventario, no hay nada que validar
  if (!usaInventario) {
    return { valid: true };
  }

  // Al crear, cantidad_inicial es obligatoria
  if (isCreating) {
    if (cantidadInicial === null || cantidadInicial === undefined) {
      return {
        valid: false,
        error: 'La cantidad inicial es obligatoria cuando el inventario está habilitado'
      };
    }

    if (cantidadInicial < 0) {
      return {
        valid: false,
        error: 'La cantidad inicial debe ser mayor o igual a 0'
      };
    }
  }

  // Validar cantidad_actual si está presente
  if (cantidadActual !== null && cantidadActual !== undefined && cantidadActual < 0) {
    return {
      valid: false,
      error: 'La cantidad actual debe ser mayor o igual a 0'
    };
  }

  return { valid: true };
}

/**
 * Prepara los valores de inventario para inserción en BD
 */
export function prepareInventoryValues(
  usaInventario: boolean,
  cantidadInicial: number | null,
  cantidadActual: number | null,
  isCreating: boolean = false
): {
  usa_inventario_db: number;
  cantidad_inicial_db: number | null;
  cantidad_actual_db: number | null;
} {
  if (!usaInventario) {
    return {
      usa_inventario_db: 0,
      cantidad_inicial_db: null,
      cantidad_actual_db: null
    };
  }

  // Al crear, cantidad_actual = cantidad_inicial
  if (isCreating) {
    return {
      usa_inventario_db: 1,
      cantidad_inicial_db: cantidadInicial,
      cantidad_actual_db: cantidadInicial
    };
  }

  return {
    usa_inventario_db: 1,
    cantidad_inicial_db: cantidadInicial,
    cantidad_actual_db: cantidadActual
  };
}
