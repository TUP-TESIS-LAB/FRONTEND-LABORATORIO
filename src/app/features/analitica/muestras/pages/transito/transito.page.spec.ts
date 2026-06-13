import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject, of } from 'rxjs';
import type { Action } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { PollingService } from '@core/refresh';
import { SectionService } from '@features/sucursales/services/section.service';
import { TransitoPage } from './transito.page';
import {
  selectMuestrasBranchId, selectMuestrasBranchName, selectMuestrasBranches, selectMuestrasError,
  selectRouting, selectTransitoItems, selectWorkspaces,
} from '../../store/muestras.selectors';
import {
  deriveTubesSuccess, dispatchTubesSuccess, initMuestras, loadTransito, loadWorkspaces,
} from '../../store/muestras.actions';
import type { LabelWorklistItem } from '../../models/label-worklist.model';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

const ITEM: LabelWorklistItem = {
  labelId: 70001, sampleId: 80001, barcode: '70001', protocolId: 50002, analysisName: 'Glucemia',
  patientName: 'Pedro García', urgent: false, status: 'IN_TRANSIT', updatedAt: '2026-06-12T08:00:00Z',
};

describe('TransitoPage (store-driven)', () => {
  let fixture: ComponentFixture<TransitoPage>;
  let actions$: Subject<Action>;
  let pollingConfig: { key: string; intervalMs: number; poll: () => unknown } | null;
  let stopSpy: ReturnType<typeof vi.fn>;

  function setup(transitoItems: LabelWorklistItem[] = [ITEM]): { store: MockStore; dispatched: unknown[] } {
    installLocalStorageMock();
    actions$ = new Subject<Action>();
    pollingConfig = null;
    stopSpy = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TransitoPage],
      providers: [
        provideNoopAnimations(),
        provideMockActions(() => actions$),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        provideMockStore({
          selectors: [
            { selector: selectTransitoItems, value: transitoItems },
            { selector: selectRouting, value: null },
            { selector: selectWorkspaces, value: [] },
            { selector: selectMuestrasBranchId, value: 1001 },
            { selector: selectMuestrasBranchName, value: 'CENTRAL' },
            { selector: selectMuestrasBranches, value: [{ id: 1001, code: 'C', name: 'CENTRAL' }] },
            { selector: selectMuestrasError, value: null },
          ],
        }),
        {
          provide: PollingService,
          useValue: {
            startPolling: vi.fn(cfg => { pollingConfig = cfg; return { stop: stopSpy, pokeNow: vi.fn(), setActive: vi.fn() }; }),
          },
        },
        { provide: SectionService, useValue: { list: vi.fn(() => of({ content: [] })) } },
      ],
    });
    const store = TestBed.inject(MockStore);
    const dispatched: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any).dispatch = (action: unknown) => { dispatched.push(action); };
    fixture = TestBed.createComponent(TransitoPage);
    return { store, dispatched };
  }

  function messagesOf(fx: ComponentFixture<TransitoPage>): MessageService {
    return fx.debugElement.injector.get(MessageService);
  }

  it('al crearse despacha initMuestras y arranca el polling de loadTransito (5s)', () => {
    const { dispatched } = setup();
    fixture.detectChanges();

    expect(dispatched).toContainEqual(initMuestras());
    expect(pollingConfig).not.toBeNull();
    expect(pollingConfig!.key).toBe('muestras-transito');
    expect(pollingConfig!.intervalMs).toBe(5000);

    pollingConfig!.poll();
    expect(dispatched).toContainEqual(loadTransito());
  });

  it('despacha loadWorkspaces y loadTransito cuando la sucursal está resuelta (un solo disparo cada uno)', () => {
    const { dispatched } = setup();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(dispatched.filter(a => (a as Action).type === loadWorkspaces().type)).toHaveLength(1);
    expect(dispatched.filter(a => (a as Action).type === loadTransito().type)).toHaveLength(1);
    // otro ciclo de effects no re-dispara
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(dispatched.filter(a => (a as Action).type === loadWorkspaces().type)).toHaveLength(1);
    expect(dispatched.filter(a => (a as Action).type === loadTransito().type)).toHaveLength(1);
  });

  it('renderiza el header con stats desde el store', () => {
    setup([ITEM]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Muestras en tránsito');
    expect(text).toContain('1 en tránsito');
  });

  it('sin routing, los tubos del store caen en la card Sin destino', () => {
    setup([ITEM]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('app-recommended-group-card');
    expect(groups.length).toBe(1);
    expect((groups[0].textContent as string)).toContain('Sin destino');
  });

  it('muestra toast de éxito en dispatchTubesSuccess', () => {
    setup();
    fixture.detectChanges();
    const add = vi.spyOn(messagesOf(fixture), 'add');
    actions$.next(dispatchTubesSuccess({ count: 3 }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success', summary: '3 tubo(s) despachados',
    }));
  });

  it('muestra toast de éxito en deriveTubesSuccess', () => {
    setup();
    fixture.detectChanges();
    const add = vi.spyOn(messagesOf(fixture), 'add');
    actions$.next(deriveTubesSuccess({ count: 2 }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success', summary: '2 tubo(s) derivados',
    }));
  });

  it('muestra toast de error humanizado cuando el store reporta error', () => {
    const { store } = setup();
    fixture.detectChanges();
    TestBed.flushEffects();
    const add = vi.spyOn(messagesOf(fixture), 'add');

    store.overrideSelector(selectMuestrasError, new HttpErrorResponse({ status: 500 }));
    store.refreshState();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(add).toHaveBeenCalledTimes(1);
    const msg = add.mock.calls[0][0];
    expect(msg.severity).toBe('error');
    expect(typeof msg.detail).toBe('string');
    expect(msg.detail!.length).toBeGreaterThan(0);
    // sin leak de internals
    expect(msg.detail).not.toMatch(/HttpErrorResponse|Exception|http/i);
  });

  it('no repite el toast si el polling devuelve el mismo error (misma firma status:message)', () => {
    const { store } = setup();
    fixture.detectChanges();
    TestBed.flushEffects();
    const add = vi.spyOn(messagesOf(fixture), 'add');

    // Primer error
    store.overrideSelector(selectMuestrasError, new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }));
    store.refreshState();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(add).toHaveBeenCalledTimes(1);

    // Nuevo objeto HttpErrorResponse con misma firma → NO debe rotoastificar
    store.overrideSelector(selectMuestrasError, new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }));
    store.refreshState();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(add).toHaveBeenCalledTimes(1);

    // Error diferente → sí debe toastificar
    store.overrideSelector(selectMuestrasError, new HttpErrorResponse({ status: 404 }));
    store.refreshState();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(add).toHaveBeenCalledTimes(2);
  });

  it('detiene el polling al destruirse', () => {
    setup();
    fixture.detectChanges();
    fixture.destroy();
    expect(stopSpy).toHaveBeenCalled();
  });
});
