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
import {
  loadHomeVisits,
  loadHomeVisitsSuccess,
  loadHomeVisitsFailure,
  createHomeVisit,
  createHomeVisitSuccess,
  createHomeVisitFailure,
} from './home-visit.actions';
import { HomeVisit, CreateHomeVisitPayload } from '../models/home-visit.model';

const visit: HomeVisit = {
  id: 1,
  appointmentId: 10,
  patientId: 20,
  branchId: 1,
  assignedExtractorId: null,
  addressStreet: 'Av. Libertad',
  addressNumber: '123',
  addressCity: 'La Plata',
  addressReferences: null,
  timeWindowStart: '08:00:00',
  timeWindowEnd: '10:00:00',
  status: 'PROGRAMADA',
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
  };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = {
      list: vi.fn(),
      create: vi.fn(),
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
});
