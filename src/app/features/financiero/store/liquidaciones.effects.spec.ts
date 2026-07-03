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
  exportSettlement, exportSettlementSuccess, exportSettlementFailure,
  informSettlement, informSettlementFailure, loadSettlement,
  loadInsurerPlans, loadInsurerPlansSuccess,
  loadInsurersIndex, loadInsurersIndexSuccess,
} from './financiero.actions';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { NOT_MODIFIED } from '@core/refresh';

describe('LiquidacionesEffects', () => {
  let actions$: Observable<unknown>;
  let api: {
    listSettlements: ReturnType<typeof vi.fn>;
    generateSettlement: ReturnType<typeof vi.fn>;
    exportSettlement: ReturnType<typeof vi.fn>;
    informSettlement: ReturnType<typeof vi.fn>;
    listSettlementPlans: ReturnType<typeof vi.fn>;
  };
  let os: { search: ReturnType<typeof vi.fn>; getCompleteById: ReturnType<typeof vi.fn> };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function make(action: unknown) {
    actions$ = of(action);
    TestBed.configureTestingModule({
      providers: [
        LiquidacionesEffects,
        provideMockActions(() => actions$),
        { provide: LiquidacionesApiService, useValue: api },
        { provide: ObraSocialService, useValue: os },
        { provide: NotificationService, useValue: notif },
      ],
    });
    return TestBed.inject(LiquidacionesEffects);
  }

  beforeEach(() => {
    api = { listSettlements: vi.fn(), generateSettlement: vi.fn(), exportSettlement: vi.fn(), informSettlement: vi.fn(), listSettlementPlans: vi.fn() };
    os = { search: vi.fn(), getCompleteById: vi.fn() };
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

  it('exportSettlement$ dispara la descarga y emite Success', async () => {
    const createUrl = vi.fn(() => 'blob:url');
    const revokeUrl = vi.fn();
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.createObjectURL = createUrl;
    (globalThis as unknown as { URL: { createObjectURL: unknown; revokeObjectURL: unknown } }).URL.revokeObjectURL = revokeUrl;
    const click = vi.fn();
    const anchor = { href: '', download: '', click, remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);

    const res = new HttpResponse<Blob>({
      body: new Blob(['x']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="liquidacion-100.xlsx"' }),
    });
    api.exportSettlement.mockReturnValue(of(res));
    const eff = make(exportSettlement({ id: 5, settlementNumber: 100 }));
    const out = await new Promise(r => eff.exportSettlement$.subscribe(r));

    expect(out).toEqual(exportSettlementSuccess());
    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('liquidacion-100.xlsx');
    vi.restoreAllMocks();
  });

  it('exportSettlement$ con error emite Failure y toast en español', async () => {
    api.exportSettlement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const eff = make(exportSettlement({ id: 5, settlementNumber: 100 }));
    const out = await new Promise<ReturnType<typeof exportSettlementFailure>>(
      r => eff.exportSettlement$.subscribe(a => r(a as ReturnType<typeof exportSettlementFailure>)),
    );
    expect(out.type).toBe(exportSettlementFailure.type);
    expect(out.error).toContain('No se pudo exportar');
    expect(notif.error).toHaveBeenCalled();
  });

  it('informSettlement$ con 409 emite Failure y además recarga el detalle (loadSettlement)', async () => {
    api.informSettlement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const eff = make(informSettlement({ id: 5, body: { informedDate: '2026-02-01', informedAmount: 1000 } }));
    const emitted: Array<{ type: string }> = [];
    await new Promise<void>(r => eff.informSettlement$.subscribe({ next: a => emitted.push(a as { type: string }), complete: r }));
    expect(emitted.map(a => a.type)).toEqual([informSettlementFailure.type, loadSettlement.type]);
    expect(notif.error).toHaveBeenCalled();
  });

  it('informSettlement$ con 422 NO recarga el detalle (solo Failure)', async () => {
    api.informSettlement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    const eff = make(informSettlement({ id: 5, body: { informedDate: '2026-02-01', informedAmount: 1000 } }));
    const emitted: Array<{ type: string }> = [];
    await new Promise<void>(r => eff.informSettlement$.subscribe({ next: a => emitted.push(a as { type: string }), complete: r }));
    expect(emitted.map(a => a.type)).toEqual([informSettlementFailure.type]);
  });

  it('loadInsurerPlans$ mapea la respuesta del endpoint de settlements (planId/planName/arancel/convenio)', async () => {
    api.listSettlementPlans.mockReturnValue(of([
      { planId: 3, planName: 'Plan A', iva: 21, arancel: 1500, nbuVersionId: 2, hasActiveAgreement: true },
      { planId: 4, planName: 'Plan B', iva: null, arancel: 0, nbuVersionId: null, hasActiveAgreement: false },
    ]));
    const eff = make(loadInsurerPlans({ insurerId: 7 }));
    const out = await new Promise(r => eff.loadInsurerPlans$.subscribe(r));
    expect(out).toEqual(loadInsurerPlansSuccess({ plans: [
      { id: 3, name: 'Plan A', iva: 21, arancel: 1500, hasActiveAgreement: true },
      { id: 4, name: 'Plan B', iva: 0, arancel: 0, hasActiveAgreement: false },
    ] }));
    expect(api.listSettlementPlans).toHaveBeenCalledWith(7);
  });

  it('loadInsurersIndex$ excluye las OS Particular (SELF_PAY)', async () => {
    os.search.mockReturnValue(of({ content: [
      { id: 1, name: 'IOMA', insurerType: 'SOCIAL' },
      { id: 2, name: 'Prepaga X', insurerType: 'PRIVATE' },
      { id: 3, name: 'Particular', insurerType: 'SELF_PAY' },
    ] }));
    const eff = make(loadInsurersIndex());
    const emitted: Array<{ type: string; insurers?: Array<{ insurerType: string }> }> = [];
    await new Promise<void>(r => eff.loadInsurersIndex$.subscribe({ next: a => emitted.push(a as never), complete: r }));
    const success = emitted.find(a => a.type === loadInsurersIndexSuccess.type);
    expect(success?.insurers?.map(i => i.insurerType)).toEqual(['SOCIAL', 'PRIVATE']);
  });
});
