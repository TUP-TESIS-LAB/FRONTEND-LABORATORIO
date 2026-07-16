import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mapAgendaError } from './agenda-error-mapper';

function buildHttpError(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/v1/turnos/agenda-configs' });
}

describe('mapAgendaError', () => {
  it('maps AgendaConfigOverlapException (400) to toast + returnToStep 3', () => {
    const error = buildHttpError(400, {
      code: 'AGENDA_CONFIG_OVERLAP',
      message: 'Overlapping agenda',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'error',
      message: 'Overlapping agenda',
      returnToStep: 3,
    });
  });

  it('maps AgendaConfigNotFoundException (404) to info toast', () => {
    const error = buildHttpError(404, {
      code: 'AGENDA_CONFIG_NOT_FOUND',
      message: 'Not found',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'info',
      message: 'Not found',
    });
  });

  it('maps fieldErrors (400 generic) to inline display', () => {
    const error = buildHttpError(400, {
      message: 'Validation failed',
      fieldErrors: { startTime: 'must be before endTime' },
    });
    const result = mapAgendaError(error);
    expect(result.display).toBe('inline');
    expect(result.fieldErrors).toEqual({ startTime: 'must be before endTime' });
  });

  it('maps 403 (AuthorizationDenied) to permission toast', () => {
    const error = buildHttpError(403, { message: 'Access denied' });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'warn',
      message: 'No tenés permiso para esta acción.',
    });
  });

  it('maps 403 ModuleDisabledException to module-disabled banner', () => {
    const error = buildHttpError(403, {
      code: 'MODULE_DISABLED',
      message: 'TURNOS disabled',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'warn',
      message: 'El módulo Turnos está desactivado para este laboratorio.',
      moduleDisabled: true,
    });
  });

  it('maps 5xx to retryable banner', () => {
    const error = buildHttpError(503, { message: 'Service unavailable' });
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'error',
      message: 'No pudimos comunicarnos con el servidor. Reintentá en unos segundos.',
      retryable: true,
    });
  });

  it('maps status 0 (network) to retryable banner', () => {
    const error = buildHttpError(0, null);
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'error',
      message: 'Sin conexión con el servidor. Verificá tu red y reintentá.',
      retryable: true,
    });
  });

  it('reconoce mensaje literal de overlap aunque no venga el code AGENDA_CONFIG_OVERLAP', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'An agenda configuration with overlapping time range and date period already exists for this branch' },
    });
    const result = mapAgendaError(err);
    expect(result.display).toBe('toast');
    expect(result.severity).toBe('error');
    expect(result.message).toContain('superpone');
    expect(result.returnToStep).toBe(3);
  });

  it('reemplaza mensajes técnicos de bean validation por texto en español', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'must not be null' },
    });
    const result = mapAgendaError(err);
    expect(result.message).not.toContain('must not be null');
    expect(result.message).toMatch(/revis|complet|requerid/i);
  });
});
