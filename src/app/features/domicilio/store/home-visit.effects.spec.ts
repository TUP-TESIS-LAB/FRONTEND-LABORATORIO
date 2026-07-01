import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { HomeVisitEffects } from './home-visit.effects';
import { HomeVisitService } from '../services/home-visit.service';
import { NotificationService } from '@core/services/notification.service';
import { NOT_MODIFIED } from '@core/refresh/polling-context';
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
  loadMyRoute,
  loadMyRouteSuccess,
  loadMyRouteNotModified,
  loadMyRouteFailure,
  loadVisitDetail,
  loadVisitDetailSuccess,
  loadVisitDetailFailure,
  prepareLabels,
  prepareLabelsSuccess,
  prepareLabelsFailure,
  markExtracted,
  markExtractedSuccess,
  markExtractedFailure,
  markOutcome,
  markOutcomeSuccess,
  markOutcomeFailure,
  rescheduleVisit,
  rescheduleVisitSuccess,
  rescheduleVisitFailure,
} from './home-visit.actions';
import { HomeVisit, CreateHomeVisitPayload, PreparedLabel } from '../models/home-visit.model';

const visit: HomeVisit = {
  id: 1,
  appointmentId: 10,
  patientId: 20,
  branchId: 1,
  assignedExtractorId: null,
  attentionId: null,
  addressStreet: 'Av. Libertad',
  addressNumber: '123',
  addressCity: 'La Plata',
  addressReferences: null,
  timeWindowStart: '08:00:00',
  timeWindowEnd: '10:00:00',
  status: 'PROGRAMADA',
  scheduledAt: '2026-07-01T09:00:00',
  patientName: 'Juan García',
  patientDni: '30123456',
  extractorName: 'Ana López',
};

const payload: CreateHomeVisitPayload = {
  patientId: 20,
  branchId: 1,
  scheduledAt: '2026-07-01T09:00:00',
  addressStreet: 'Av. Libertad',
  addressCity: 'La Plata',
  timeWindowStart: '08:00:00',
  timeWindowEnd: '10:00:00',
};

describe('HomeVisitEffects', () => {
  let actions$: Observable<Action>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    myRoute: ReturnType<typeof vi.fn>;
    detail: ReturnType<typeof vi.fn>;
    prepareLabels: ReturnType<typeof vi.fn>;
    markExtracted: ReturnType<typeof vi.fn>;
    markOutcome: ReturnType<typeof vi.fn>;
    reschedule: ReturnType<typeof vi.fn>;
  };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = {
      list: vi.fn(),
      create: vi.fn(),
      myRoute: vi.fn(),
      detail: vi.fn(),
      prepareLabels: vi.fn(),
      markExtracted: vi.fn(),
      markOutcome: vi.fn(),
      reschedule: vi.fn(),
    };
    notif = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        HomeVisitEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: HomeVisitService, useValue: service },
        { provide: NotificationService, useValue: notif },
      ],
    });
  });

  // ── loadHomeVisits$ ─────────────────────────────────────────────────────────

  it('loadHomeVisits$ emite loadHomeVisitsSuccess con la lista devuelta', async () => {
    service.list.mockReturnValue(of([visit]));
    actions$ = of(loadHomeVisits({ branchId: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadHomeVisits$);
    expect(service.list).toHaveBeenCalledWith(1);
    expect(action).toEqual(loadHomeVisitsSuccess({ visits: [visit] }));
  });

  it('loadHomeVisits$ emite loadHomeVisitsSuccess con lista vacía', async () => {
    service.list.mockReturnValue(of([]));
    actions$ = of(loadHomeVisits({ branchId: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadHomeVisits$);
    expect(action).toEqual(loadHomeVisitsSuccess({ visits: [] }));
  });

  it('loadHomeVisits$ mapea errores a loadHomeVisitsFailure', async () => {
    service.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadHomeVisits({ branchId: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadHomeVisits$);
    expect(action.type).toBe('[Domicilio API] Load Home Visits Failure');
  });

  it('loadHomeVisits$ ante 404 usa mensaje en español correcto', async () => {
    service.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(loadHomeVisits({ branchId: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadHomeVisits$);
    expect((action as ReturnType<typeof loadHomeVisitsFailure>).error).toBe(
      'La visita solicitada no existe.',
    );
  });

  // ── createHomeVisit$ ────────────────────────────────────────────────────────

  it('createHomeVisit$ ante éxito muestra notif.success y emite createHomeVisitSuccess', async () => {
    service.create.mockReturnValue(of({ id: 42 }));
    actions$ = of(createHomeVisit({ payload }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.createHomeVisit$);
    expect(service.create).toHaveBeenCalledWith(payload);
    expect(notif.success).toHaveBeenCalledWith('Visita domiciliaria programada correctamente.');
    expect(action).toEqual(createHomeVisitSuccess({ id: 42 }));
  });

  it('createHomeVisit$ ante 422 mapea el mensaje en español y muestra notif.error', async () => {
    service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(createHomeVisit({ payload }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.createHomeVisit$);
    expect((action as ReturnType<typeof createHomeVisitFailure>).error).toBe(
      'Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.',
    );
    expect(notif.error).toHaveBeenCalledWith(
      'Los datos de la visita son inválidos. Revisá los campos e intentá de nuevo.',
    );
  });

  it('createHomeVisit$ ante 409 mapea el mensaje de conflicto', async () => {
    service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(createHomeVisit({ payload }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.createHomeVisit$);
    expect((action as ReturnType<typeof createHomeVisitFailure>).error).toBe(
      'Ya existe una visita programada para ese turno.',
    );
    expect(notif.error).toHaveBeenCalled();
  });

  it('createHomeVisit$ ante 500 muestra mensaje genérico', async () => {
    service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(createHomeVisit({ payload }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.createHomeVisit$);
    expect(action.type).toBe('[Domicilio API] Create Home Visit Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── loadMyRoute$ ────────────────────────────────────────────────────────────

  it('loadMyRoute$ emite loadMyRouteSuccess con la lista devuelta', async () => {
    service.myRoute.mockReturnValue(of([visit]));
    actions$ = of(loadMyRoute({}));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadMyRoute$);
    expect(service.myRoute).toHaveBeenCalledWith(undefined);
    expect(action).toEqual(loadMyRouteSuccess({ visits: [visit] }));
  });

  it('loadMyRoute$ con fecha pasa el parámetro al servicio', async () => {
    service.myRoute.mockReturnValue(of([visit]));
    actions$ = of(loadMyRoute({ date: '2026-07-01' }));
    const effects = TestBed.inject(HomeVisitEffects);
    await firstValueFrom(effects.loadMyRoute$);
    expect(service.myRoute).toHaveBeenCalledWith('2026-07-01');
  });

  it('loadMyRoute$ ante 304 emite loadMyRouteNotModified', async () => {
    service.myRoute.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadMyRoute({}));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadMyRoute$);
    expect(action).toEqual(loadMyRouteNotModified());
  });

  it('loadMyRoute$ ante error emite loadMyRouteFailure y muestra notif.error', async () => {
    service.myRoute.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    actions$ = of(loadMyRoute({}));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadMyRoute$);
    expect(action.type).toBe('[Domicilio API] Load My Route Failure');
    expect(notif.error).toHaveBeenCalledWith('Ocurrió un error al procesar la operación. Intentá de nuevo.');
  });

  it('loadMyRoute$ ante 404 mapea mensaje en español correcto', async () => {
    service.myRoute.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(loadMyRoute({}));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadMyRoute$);
    expect((action as ReturnType<typeof loadMyRouteFailure>).error).toBe('La visita solicitada no existe.');
    expect(notif.error).toHaveBeenCalledWith('La visita solicitada no existe.');
  });

  // ── loadVisitDetail$ ────────────────────────────────────────────────────────

  it('loadVisitDetail$ emite loadVisitDetailSuccess con la visita devuelta', async () => {
    service.detail.mockReturnValue(of(visit));
    actions$ = of(loadVisitDetail({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadVisitDetail$);
    expect(service.detail).toHaveBeenCalledWith(1);
    expect(action).toEqual(loadVisitDetailSuccess({ visit }));
  });

  it('loadVisitDetail$ ante 404 emite loadVisitDetailFailure con mensaje en español', async () => {
    service.detail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(loadVisitDetail({ id: 99 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadVisitDetail$);
    expect(action.type).toBe('[Domicilio API] Load Visit Detail Failure');
    expect(notif.error).toHaveBeenCalledWith('La visita solicitada no existe.');
  });

  it('loadVisitDetail$ ante 500 emite failure con mensaje genérico', async () => {
    service.detail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadVisitDetail({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.loadVisitDetail$);
    expect(action.type).toBe('[Domicilio API] Load Visit Detail Failure');
    expect(notif.error).toHaveBeenCalledWith('Ocurrió un error al procesar la operación. Intentá de nuevo.');
  });

  // ── prepareLabels$ ──────────────────────────────────────────────────────────

  it('prepareLabels$ emite prepareLabelsSuccess, notif.success y guarda labels al éxito', async () => {
    const labels: PreparedLabel[] = [{ labelId: 101, analysisId: 201 }];
    service.prepareLabels.mockReturnValue(of({ visit, labels }));
    actions$ = of(prepareLabels({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.prepareLabels$);
    expect(service.prepareLabels).toHaveBeenCalledWith(1);
    expect(notif.success).toHaveBeenCalledWith('Rótulos preparados');
    expect(action).toEqual(prepareLabelsSuccess({ visit, labels }));
  });

  it('prepareLabels$ ante 422 mapea mensaje de estado inválido', async () => {
    service.prepareLabels.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(prepareLabels({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.prepareLabels$);
    expect(action.type).toBe('[Domicilio API] Prepare Labels Failure');
    expect((action as ReturnType<typeof prepareLabelsFailure>).error).toBe(
      'No se pueden preparar los rótulos: la visita está en un estado inválido.',
    );
    expect(notif.error).toHaveBeenCalledWith('No se pueden preparar los rótulos: la visita está en un estado inválido.');
  });

  it('prepareLabels$ ante 404 mapea mensaje de visita no encontrada', async () => {
    service.prepareLabels.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(prepareLabels({ id: 99 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.prepareLabels$);
    expect((action as ReturnType<typeof prepareLabelsFailure>).error).toBe('La visita solicitada no existe.');
    expect(notif.error).toHaveBeenCalled();
  });

  it('prepareLabels$ ante 500 emite Failure con mensaje genérico', async () => {
    service.prepareLabels.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(prepareLabels({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.prepareLabels$);
    expect(action.type).toBe('[Domicilio API] Prepare Labels Failure');
    expect(notif.error).toHaveBeenCalledWith('Ocurrió un error al preparar los rótulos. Intentá de nuevo.');
  });

  // ── markExtracted$ ──────────────────────────────────────────────────────────

  it('markExtracted$ pasa scannedBarcode al servicio y emite markExtractedSuccess', async () => {
    const updatedVisit = { ...visit, status: 'EXTRAIDA' as const };
    service.markExtracted.mockReturnValue(of(updatedVisit));
    actions$ = of(markExtracted({ id: 1, scannedBarcode: 'BARCODE-001' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect(service.markExtracted).toHaveBeenCalledWith(1, 'BARCODE-001');
    expect(notif.success).toHaveBeenCalledWith('Muestra extraída correctamente.');
    expect(action).toEqual(markExtractedSuccess({ visit: updatedVisit }));
  });

  it('markExtracted$ ante 422 rótulo incorrecto mapea mensaje de mismatch', async () => {
    const errorBody = { message: 'El rótulo escaneado no corresponde al paciente de esta visita.' };
    service.markExtracted.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: errorBody })),
    );
    actions$ = of(markExtracted({ id: 1, scannedBarcode: 'WRONG' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect(action.type).toBe('[Domicilio API] Mark Extracted Failure');
    expect((action as ReturnType<typeof markExtractedFailure>).error).toBe(
      'El rótulo escaneado no corresponde al paciente de esta visita.',
    );
    expect(notif.error).toHaveBeenCalledWith('El rótulo escaneado no corresponde al paciente de esta visita.');
  });

  it('markExtracted$ ante 422 no preparada mapea mensaje de rótulos no preparados', async () => {
    const errorBody = { message: 'La visita no tiene rótulos preparados.' };
    service.markExtracted.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: errorBody })),
    );
    actions$ = of(markExtracted({ id: 1, scannedBarcode: 'BARCODE-001' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect((action as ReturnType<typeof markExtractedFailure>).error).toBe(
      'La visita no tiene rótulos preparados.',
    );
    expect(notif.error).toHaveBeenCalledWith('La visita no tiene rótulos preparados.');
  });

  it('markExtracted$ ante 409 mapea mensaje de transición inválida y emite Failure', async () => {
    service.markExtracted.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(markExtracted({ id: 1, scannedBarcode: 'BARCODE-001' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect(action.type).toBe('[Domicilio API] Mark Extracted Failure');
    expect((action as ReturnType<typeof markExtractedFailure>).error).toBe(
      'La visita ya fue procesada y no admite esta acción.',
    );
    expect(notif.error).toHaveBeenCalledWith('La visita ya fue procesada y no admite esta acción.');
  });

  it('markExtracted$ ante 404 mapea mensaje de visita no encontrada', async () => {
    service.markExtracted.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(markExtracted({ id: 99, scannedBarcode: 'BARCODE-001' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect((action as ReturnType<typeof markExtractedFailure>).error).toBe(
      'La visita solicitada no existe o no tenés permiso para operarla.',
    );
    expect(notif.error).toHaveBeenCalled();
  });

  it('markExtracted$ ante 500 emite Failure con mensaje genérico', async () => {
    service.markExtracted.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(markExtracted({ id: 1, scannedBarcode: 'BARCODE-001' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markExtracted$);
    expect(action.type).toBe('[Domicilio API] Mark Extracted Failure');
    expect(notif.error).toHaveBeenCalledWith('Ocurrió un error al procesar la operación. Intentá de nuevo.');
  });

  // ── markOutcome$ ────────────────────────────────────────────────────────────

  it('markOutcome$ emite markOutcomeSuccess y notif.success al éxito', async () => {
    const updatedVisit = { ...visit, status: 'NO_REALIZADA' as const };
    service.markOutcome.mockReturnValue(of(updatedVisit));
    actions$ = of(markOutcome({ id: 1, reason: 'PACIENTE_AUSENTE' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markOutcome$);
    expect(service.markOutcome).toHaveBeenCalledWith(1, 'PACIENTE_AUSENTE');
    expect(notif.success).toHaveBeenCalledWith('Estado de la visita registrado correctamente.');
    expect(action).toEqual(markOutcomeSuccess({ visit: updatedVisit }));
  });

  it('markOutcome$ ante 409 mapea mensaje de transición inválida', async () => {
    service.markOutcome.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(markOutcome({ id: 1, reason: 'RECHAZO_PACIENTE' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markOutcome$);
    expect(action.type).toBe('[Domicilio API] Mark Outcome Failure');
    expect((action as ReturnType<typeof markOutcomeFailure>).error).toBe(
      'La visita ya fue procesada y no admite esta acción.',
    );
    expect(notif.error).toHaveBeenCalledWith('La visita ya fue procesada y no admite esta acción.');
  });

  it('markOutcome$ ante 403 mapea mensaje de permisos', async () => {
    service.markOutcome.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    actions$ = of(markOutcome({ id: 1, reason: 'NO_SE_PUDO_EXTRAER' }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.markOutcome$);
    expect((action as ReturnType<typeof markOutcomeFailure>).error).toBe(
      'No tenés permiso para realizar esta operación.',
    );
    expect(notif.error).toHaveBeenCalled();
  });

  // ── rescheduleVisit$ ────────────────────────────────────────────────────────

  it('rescheduleVisit$ emite rescheduleVisitSuccess y notif.success al éxito', async () => {
    const updatedVisit = { ...visit, status: 'REPROGRAMADA' as const };
    service.reschedule.mockReturnValue(of(updatedVisit));
    actions$ = of(rescheduleVisit({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.rescheduleVisit$);
    expect(service.reschedule).toHaveBeenCalledWith(1);
    expect(notif.success).toHaveBeenCalledWith('Visita reprogramada correctamente.');
    expect(action).toEqual(rescheduleVisitSuccess({ visit: updatedVisit }));
  });

  it('rescheduleVisit$ ante 409 mapea mensaje de transición inválida', async () => {
    service.reschedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(rescheduleVisit({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.rescheduleVisit$);
    expect(action.type).toBe('[Domicilio API] Reschedule Visit Failure');
    expect((action as ReturnType<typeof rescheduleVisitFailure>).error).toBe(
      'La visita ya fue procesada y no admite esta acción.',
    );
    expect(notif.error).toHaveBeenCalledWith('La visita ya fue procesada y no admite esta acción.');
  });

  it('rescheduleVisit$ ante 404 mapea mensaje de visita no encontrada', async () => {
    service.reschedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(rescheduleVisit({ id: 99 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.rescheduleVisit$);
    expect((action as ReturnType<typeof rescheduleVisitFailure>).error).toBe(
      'La visita solicitada no existe o no tenés permiso para operarla.',
    );
    expect(notif.error).toHaveBeenCalled();
  });

  it('rescheduleVisit$ ante 500 emite Failure con mensaje genérico', async () => {
    service.reschedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(rescheduleVisit({ id: 1 }));
    const effects = TestBed.inject(HomeVisitEffects);
    const action = await firstValueFrom(effects.rescheduleVisit$);
    expect(action.type).toBe('[Domicilio API] Reschedule Visit Failure');
    expect(notif.error).toHaveBeenCalledWith('Ocurrió un error al procesar la operación. Intentá de nuevo.');
  });
});
