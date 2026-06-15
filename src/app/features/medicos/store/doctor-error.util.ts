import { humanizeBackendError, BackendErrorShape } from '@shared/utils/error-messages';

/**
 * Mensaje en español, user-friendly y sin leak de internals (regla #4) para un error
 * al guardar un médico derivante. Consistente con el toast de empleados (PR-B).
 */
export function doctorSaveErrorMessage(err: BackendErrorShape | null | undefined): string {
  return humanizeBackendError(err, {
    fallback: 'No se pudo guardar el médico.',
    byStatus: {
      409: 'Ya existe un médico con esa matrícula.',
      400: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
      422: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
      500: 'No se pudo guardar el médico. Intentá de nuevo en unos minutos.',
    },
  });
}
