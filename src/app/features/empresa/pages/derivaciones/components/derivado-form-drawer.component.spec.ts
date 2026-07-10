import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DerivadoFormDrawerComponent } from './derivado-form-drawer.component';
import { ExternalLabRequest } from '../../../models/external-lab.model';

describe('DerivadoFormDrawerComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [DerivadoFormDrawerComponent],
      providers: [provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(DerivadoFormDrawerComponent);
    const cmp = fixture.componentInstance;
    // Abrir en modo "nuevo" para que canSave no exija dirty.
    cmp.visible = true;
    cmp.lab = null;
    cmp.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
    });
    fixture.detectChanges();
    return { fixture, cmp };
  }

  it('canSave es false cuando el nombre está vacío', () => {
    const { cmp } = setup();
    cmp.name.set('   ');
    expect(cmp.canSave()).toBe(false);
  });

  it('canSave es false cuando un contacto tiene el value vacío', () => {
    const { cmp } = setup();
    cmp.name.set('GenLab');
    cmp.contacts.set([{ contactType: 'EMAIL', value: 'a@b.com' }, { contactType: 'PHONE', value: '' }]);
    expect(cmp.canSave()).toBe(false);
  });

  it('canSave es true con nombre y contactos válidos', () => {
    const { cmp } = setup();
    cmp.name.set('GenLab');
    cmp.contacts.set([{ contactType: 'EMAIL', value: 'a@b.com' }]);
    expect(cmp.canSave()).toBe(true);
  });

  it('descarta contactos con value vacío al armar el request y emitir save', () => {
    const { cmp } = setup();
    cmp.name.set('GenLab');
    // Fila con solo espacios: se descarta al construir el request.
    cmp.contacts.set([
      { contactType: 'EMAIL', value: 'a@b.com' },
      { contactType: 'PHONE', value: '  ' },
    ]);

    // buildRequest siempre descarta (canSave bloquea el submit, pero la lógica de descarte vive acá).
    expect(cmp.buildRequest().contacts).toEqual([{ contactType: 'EMAIL', value: 'a@b.com' }]);

    // Y con contactos válidos, onSave emite el request depurado.
    cmp.contacts.set([{ contactType: 'EMAIL', value: '  a@b.com  ' }]);
    let emitted: ExternalLabRequest | undefined;
    cmp.save.subscribe((req) => (emitted = req));
    cmp.onSave();
    expect(emitted).toBeDefined();
    expect(emitted!.contacts).toEqual([{ contactType: 'EMAIL', value: 'a@b.com' }]);
  });
});
