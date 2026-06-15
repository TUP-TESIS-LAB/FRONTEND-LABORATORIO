import { humanizeBackendError, BackendErrorShape } from '@shared/utils/error-messages';

/**
 * Mensaje en español, user-friendly y sin leak de internals (regla #4) para un
 * error al guardar (alta/edición) un empleado. Centralizado acá para reusarlo
 * tanto en el effect que dispara el toast como en cualquier handler de page.
 */
export function employeeSaveErrorMessage(err: BackendErrorShape | null | undefined): string {
  return humanizeBackendError(err, {
    fallback: 'No se pudo guardar el empleado.',
    byStatus: {
      409: 'Ya existe un empleado con ese documento.',
      400: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
      422: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
      500: 'No se pudo guardar el empleado. Intentá de nuevo en unos minutos.',
    },
  });
}
