import { By } from '@angular/platform-browser';
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
import { EventConfigRowComponent } from './components/event-config-row/event-config-row.component';
import { NotificacionesConfigPage } from './notificaciones-config.page';

function eventConfig(over: Partial<EventConfig> = {}): EventConfig {
  return {
    eventType: 'RESULT_READY',
    title: 'Resultado listo',
    enabled: true,
    hasTrigger: true,
    recipients: [],
    ...over,
  };
}

describe('NotificacionesConfigPage', () => {
  let store: MockStore;

  function configure(eventConfigs: EventConfig[] = []): void {
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
  }

  it('despacha loadConfigs en ngOnInit', () => {
    configure([]);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    fixture.detectChanges();

    expect(dispatchSpy).toHaveBeenCalledWith(loadConfigs());
  });

  it('renderiza una fila por cada evento de selectEventConfigs', () => {
    configure([
      eventConfig({ eventType: 'RESULT_READY', title: 'Resultado listo' }),
      eventConfig({ eventType: 'CASH_BOX_CLOSED', title: 'Cierre de caja', hasTrigger: false }),
    ]);
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.directive(EventConfigRowComponent));
    expect(rows.length).toBe(2);
    expect(rows[0].componentInstance.config().eventType).toBe('RESULT_READY');
    expect(rows[1].componentInstance.config().eventType).toBe('CASH_BOX_CLOSED');
  });

  it('al (update) de una fila despacha updateConfig con el payload recibido', () => {
    configure([eventConfig({ eventType: 'RESULT_READY' })]);
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const row = fixture.debugElement.query(By.directive(EventConfigRowComponent));
    const payload = { eventType: 'RESULT_READY', enabled: false, recipients: [{ type: 'USER' as const, ref: '1' }] };
    row.componentInstance.update.emit(payload);

    expect(dispatchSpy).toHaveBeenCalledWith(updateConfig(payload));
  });

  it('al (pickerOpen) de una fila despacha loadEligible para ese eventType', () => {
    configure([eventConfig({ eventType: 'RESULT_READY' })]);
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const row = fixture.debugElement.query(By.directive(EventConfigRowComponent));
    row.componentInstance.pickerOpen.emit();

    expect(dispatchSpy).toHaveBeenCalledWith(loadEligible({ eventType: 'RESULT_READY' }));
  });

  it('muestra un estado vacío cuando no hay eventos configurados', () => {
    configure([]);
    const fixture = TestBed.createComponent(NotificacionesConfigPage);
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.directive(EventConfigRowComponent));
    expect(rows.length).toBe(0);
  });
});
