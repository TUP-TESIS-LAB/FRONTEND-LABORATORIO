import { HttpErrorResponse } from '@angular/common/http';

export type MapDisplay = 'toast' | 'banner' | 'inline';
export type MapSeverity = 'error' | 'warn' | 'info' | 'success';

export interface MappedAgendaError {
  display: MapDisplay;
  severity: MapSeverity;
  message: string;
  returnToStep?: number;
  fieldErrors?: Record<string, string>;
  moduleDisabled?: boolean;
  retryable?: boolean;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export function mapAgendaError(error: HttpErrorResponse): MappedAgendaError {
  const body = (error.error ?? {}) as ApiErrorBody;
  const code = body.code;
  const apiMessage = body.message;

  if (error.status === 0) {
    return {
      display: 'banner',
      severity: 'error',
      message: 'Sin conexión con el servidor. Verificá tu red y reintentá.',
      retryable: true,
    };
  }

  if (error.status >= 500) {
    return {
      display: 'banner',
      severity: 'error',
      message: 'No pudimos comunicarnos con el servidor. Reintentá en unos segundos.',
      retryable: true,
    };
  }

  if (error.status === 400 && code === 'AGENDA_CONFIG_OVERLAP') {
    return {
      display: 'toast',
      severity: 'error',
      message: apiMessage ?? 'La agenda se superpone con otra ya configurada.',
      returnToStep: 3,
    };
  }

  if (error.status === 400 && body.fieldErrors) {
    return {
      display: 'inline',
      severity: 'error',
      message: apiMessage ?? 'Revisá los campos marcados.',
      fieldErrors: body.fieldErrors,
    };
  }

  if (error.status === 404 && code === 'AGENDA_CONFIG_NOT_FOUND') {
    return {
      display: 'toast',
      severity: 'info',
      message: apiMessage ?? 'No encontramos la agenda solicitada.',
    };
  }

  if (error.status === 403 && code === 'MODULE_DISABLED') {
    return {
      display: 'banner',
      severity: 'warn',
      message: 'El módulo Turnos está desactivado para este laboratorio.',
      moduleDisabled: true,
    };
  }

  if (error.status === 403) {
    return {
      display: 'toast',
      severity: 'warn',
      message: 'No tenés permiso para esta acción.',
    };
  }

  return {
    display: 'toast',
    severity: 'error',
    message: apiMessage ?? 'Ocurrió un error inesperado.',
  };
}
