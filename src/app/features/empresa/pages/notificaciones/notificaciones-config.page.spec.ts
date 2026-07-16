import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockActions } from '@ngrx/effects/testing';
import { Store } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { NEVER } from 'rxjs';

import { EventConfig } from '../../models/notificaciones-config.model';
import {
  loadConfigs, loadEligible, updateConfig,
} from '../../store/notificaciones-config/notificaciones-config.actions';
import { NOTIF_CONFIG_FEATURE_KEY, initialNotifConfigState } from '../../store/notificaciones-config/notificaciones-config.state';
import { NotificacionesConfigPage } from './notificaciones-config.page';
import { StatusFilter } from './notificaciones-filter.logic';

/**
 * Nota: bajo Vitest (JIT) el template con `ui-table` (signal inputs) no bindea, así que estos
 * tests no usan `detectChanges()` — ejercen los métodos de dispatch y los computed de filtro
 * directamente sobre la instancia. El rendering se cubre con `ng test`.
 */
function eventConfig(over: Partial<EventConfig> = {}): EventConfig {
  return {
    eventType: 'RESULT_READY',
    title: 'Resultado listo',
    enabled: true,
    hasTrigger: true,
    recipients: [],
    section: 'EXTRACCIONES',
    ...over,
  };
}

interface PageInternals {
  search: WritableSignal<string>;
  moduleFilter: WritableSignal<string>;
  statusFilter: WritableSignal<StatusFilter>;
  visible(): EventConfig[];
  activeCount(): number;
  moduleOptions(): { label: string; value: string }[];
  onRowExpand(row: EventConfig): void;
  onToggle(row: EventConfig, enabled: boolean): void;
  onRecipients(row: EventConfig, recipients: EventConfig['recipients']): void;
}

describe('NotificacionesConfigPage', () => {
  let store: MockStore;

  function create(eventConfigs: EventConfig[] = []) {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideMockActions(() => NEVER),
        provideMockStore({
          initialState: {
            [NOTIF_CONFIG_FEATURE_KEY]: { ...initialNotifConfigState, eventConfigs },
          },
        }),
      ],
    });
    store = TestBed.inject(Store) as MockStore;
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    const comp = fixture.componentInstance as unknown as PageInternals;
    return { fixture, comp };
  }

  it('despacha loadConfigs en ngOnInit', () => {
    const { fixture } = create([]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(loadConfigs());
  });

  it('el filtro "Solo activos" oculta los eventos deshabilitados', () => {
    const { comp } = create([
      eventConfig({ eventType: 'A', enabled: true }),
      eventConfig({ eventType: 'B', enabled: false }),
    ]);
    comp.statusFilter.set('active');
    expect(comp.visible().map((c) => c.eventType)).toEqual(['A']);
  });

  it('la búsqueda filtra por título (case-insensitive)', () => {
    const { comp } = create([
      eventConfig({ eventType: 'A', title: 'Cierre de caja' }),
      eventConfig({ eventType: 'B', title: 'Resultado listo' }),
    ]);
    comp.search.set('caja');
    expect(comp.visible().map((c) => c.eventType)).toEqual(['A']);
  });

  it('el filtro Módulo filtra por section', () => {
    const { comp } = create([
      eventConfig({ eventType: 'A', section: 'FINANCIERO' }),
      eventConfig({ eventType: 'B', section: 'EXTRACCIONES' }),
    ]);
    comp.moduleFilter.set('FINANCIERO');
    expect(comp.visible().map((c) => c.eventType)).toEqual(['A']);
  });

  it('activeCount cuenta los eventos habilitados visibles', () => {
    const { comp } = create([
      eventConfig({ eventType: 'A', enabled: true }),
      eventConfig({ eventType: 'B', enabled: false }),
    ]);
    expect(comp.activeCount()).toBe(1);
  });

  it('moduleOptions incluye "Todos" y las secciones presentes', () => {
    const { comp } = create([
      eventConfig({ eventType: 'A', section: 'FINANCIERO' }),
      eventConfig({ eventType: 'B', section: 'FINANCIERO' }),
    ]);
    const values = comp.moduleOptions().map((o) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('FINANCIERO');
  });

  it('expandir una fila despacha loadEligible para ese eventType', () => {
    const { comp } = create([eventConfig({ eventType: 'CASH_BOX_CLOSED' })]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    comp.onRowExpand(eventConfig({ eventType: 'CASH_BOX_CLOSED' }));
    expect(dispatchSpy).toHaveBeenCalledWith(loadEligible({ eventType: 'CASH_BOX_CLOSED' }));
  });

  it('el toggle inline despacha updateConfig con el enabled nuevo, preservando recipients', () => {
    const row = eventConfig({ eventType: 'RESULT_READY', enabled: false, recipients: [{ type: 'ROLE', ref: 'ADMIN' }] });
    const { comp } = create([row]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    comp.onToggle(row, true);
    expect(dispatchSpy).toHaveBeenCalledWith(
      updateConfig({ eventType: 'RESULT_READY', enabled: true, recipients: [{ type: 'ROLE', ref: 'ADMIN' }] }),
    );
  });

  it('editar destinatarios despacha updateConfig preservando enabled', () => {
    const row = eventConfig({ eventType: 'RESULT_READY', enabled: true });
    const { comp } = create([row]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    comp.onRecipients(row, [{ type: 'USER', ref: '7' }]);
    expect(dispatchSpy).toHaveBeenCalledWith(
      updateConfig({ eventType: 'RESULT_READY', enabled: true, recipients: [{ type: 'USER', ref: '7' }] }),
    );
  });
});
