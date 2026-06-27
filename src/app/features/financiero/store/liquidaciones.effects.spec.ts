import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LiquidacionesEffects } from './liquidaciones.effects';
import { LiquidacionesApiService } from '../services/liquidaciones-api.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
} from './financiero.actions';
import { NOT_MODIFIED } from '@core/refresh';

describe('LiquidacionesEffects', () => {
  let actions$: Observable<unknown>;
  let api: { listSettlements: ReturnType<typeof vi.fn>; generateSettlement: ReturnType<typeof vi.fn> };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function make(action: unknown) {
    actions$ = of(action);
    TestBed.configureTestingModule({
      providers: [
        LiquidacionesEffects,
        provideMockActions(() => actions$),
        { provide: LiquidacionesApiService, useValue: api },
        { provide: ObraSocialService, useValue: { search: vi.fn(), getCompleteById: vi.fn() } },
        { provide: NotificationService, useValue: notif },
      ],
    });
    return TestBed.inject(LiquidacionesEffects);
  }

  beforeEach(() => {
    api = { listSettlements: vi.fn(), generateSettlement: vi.fn() };
    notif = { success: vi.fn(), error: vi.fn() };
  });

  it('loadSettlements$ emite Success con los items', async () => {
    api.listSettlements.mockReturnValue(of([{ id: 1 }]));
    const eff = make(loadSettlements({ filters: {} }));
    const out = await new Promise(r => eff.loadSettlements$.subscribe(r));
    expect(out).toEqual(loadSettlementsSuccess({ items: [{ id: 1 } as never] }));
  });

  it('loadSettlements$ emite NotModified cuando vuelve 304', async () => {
    api.listSettlements.mockReturnValue(of(NOT_MODIFIED));
    const eff = make(loadSettlements({ filters: {} }));
    const out = await new Promise(r => eff.loadSettlements$.subscribe(r));
    expect(out).toEqual(loadSettlementsNotModified());
  });

  it('generateSettlement$ con 422 emite Failure con mensaje en español y toast', async () => {
    api.generateSettlement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    const eff = make(generateSettlement({ body: { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    const out = await new Promise<ReturnType<typeof generateSettlementFailure>>(
      r => eff.generateSettlement$.subscribe(a => r(a as ReturnType<typeof generateSettlementFailure>)),
    );
    expect(out.type).toBe(generateSettlementFailure.type);
    expect(out.error).toContain('No hay prestaciones pendientes');
    expect(notif.error).toHaveBeenCalled();
  });

  it('generateSettlement$ con éxito emite Success y toast', async () => {
    api.generateSettlement.mockReturnValue(of({ id: 9 }));
    const eff = make(generateSettlement({ body: { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    const out = await new Promise(r => eff.generateSettlement$.subscribe(r));
    expect(out).toEqual(generateSettlementSuccess({ settlement: { id: 9 } as never }));
    expect(notif.success).toHaveBeenCalled();
  });
});
