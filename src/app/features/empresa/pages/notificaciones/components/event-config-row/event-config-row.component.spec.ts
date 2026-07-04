import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { EligibleRecipients, EventConfig } from '../../../../models/notificaciones-config.model';
import { EventConfigRowComponent } from './event-config-row.component';

function config(over: Partial<EventConfig> = {}): EventConfig {
  return {
    eventType: 'RESULT_READY',
    title: 'Resultado listo',
    enabled: true,
    hasTrigger: true,
    recipients: [],
    ...over,
  };
}

describe('EventConfigRowComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('deshabilita el toggle y muestra "Próximamente" cuando el evento es inerte (hasTrigger=false)', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config({ eventType: 'CASH_BOX_CLOSED', hasTrigger: false }));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Próximamente');
  });

  it('no deshabilita el toggle cuando el evento tiene disparador (hasTrigger=true)', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config({ hasTrigger: true }));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Próximamente');
  });

  it('emite update con el nuevo enabled al togglear', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config({ enabled: false, recipients: [{ type: 'USER', ref: '1' }] }));
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.update.subscribe((e) => emitted.push(e));

    (fixture.componentInstance as unknown as { onToggle(v: boolean): void }).onToggle(true);

    expect(emitted).toEqual([
      { eventType: 'RESULT_READY', enabled: true, recipients: [{ type: 'USER', ref: '1' }] },
    ]);
  });

  it('emite update con los nuevos recipients (usuarios) preservando los roles ya elegidos', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config({
      enabled: true,
      recipients: [{ type: 'ROLE', ref: 'ADMINISTRADOR' }],
    }));
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.update.subscribe((e) => emitted.push(e));

    (fixture.componentInstance as unknown as { onUsersChange(ids: number[]): void }).onUsersChange([7, 9]);

    expect(emitted).toEqual([
      {
        eventType: 'RESULT_READY',
        enabled: true,
        recipients: [
          { type: 'USER', ref: '7' },
          { type: 'USER', ref: '9' },
          { type: 'ROLE', ref: 'ADMINISTRADOR' },
        ],
      },
    ]);
  });

  it('marca con warning (deshabilitadas) las opciones de usuarios sin acceso, sin dejar agregarlas', () => {
    const eligible: EligibleRecipients = {
      users: [
        { id: 1, nombre: 'Ana Gómez', tieneAcceso: true },
        { id: 2, nombre: 'Beto Ruiz', tieneAcceso: false },
      ],
      roles: [],
    };

    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config());
    fixture.componentRef.setInput('eligible', eligible);
    fixture.detectChanges();

    const options = (fixture.componentInstance as unknown as {
      userOptions(): { id: number; nombre: string; disabled: boolean }[];
    }).userOptions();

    expect(options).toEqual([
      { id: 1, nombre: 'Ana Gómez', disabled: false },
      { id: 2, nombre: 'Beto Ruiz', disabled: true },
    ]);
  });

  it('emite pickerOpen cuando se abre el picker (para cargar los elegibles on-demand)', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config());
    fixture.detectChanges();

    const emitted: void[] = [];
    fixture.componentInstance.pickerOpen.subscribe(() => emitted.push(undefined));

    (fixture.componentInstance as unknown as { onPickerShow(): void }).onPickerShow();

    expect(emitted.length).toBe(1);
  });

  it('renderiza los dos multiselects (usuarios y roles)', () => {
    const fixture = TestBed.createComponent(EventConfigRowComponent);
    fixture.componentRef.setInput('config', config());
    fixture.detectChanges();

    const multiSelects = fixture.nativeElement.querySelectorAll('p-multiselect');
    expect(multiSelects.length).toBe(2);
  });
});
