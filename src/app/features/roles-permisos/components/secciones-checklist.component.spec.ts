import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SeccionesChecklistComponent } from './secciones-checklist.component';

describe('SeccionesChecklistComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeccionesChecklistComponent], providers: [provideNoopAnimations()] });
  });

  it('agrupa el catalogo y marca lo del workingSet', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    fixture.componentInstance.catalog = [
      { code: 'ATENCION', label: 'Atención' },
      { code: 'TURNOS', label: 'Turnos' },
    ];
    fixture.componentInstance.workingSet = ['TURNOS'];
    fixture.detectChanges();
    expect(fixture.componentInstance.groups().length).toBe(2);
    expect(fixture.componentInstance.isChecked('TURNOS')).toBe(true);
    expect(fixture.componentInstance.isChecked('ATENCION')).toBe(false);
  });

  it('emite toggle con el code', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    fixture.componentInstance.catalog = [{ code: 'TURNOS', label: 'Turnos' }];
    fixture.componentInstance.workingSet = [];
    let emitted: string | undefined;
    fixture.componentInstance.toggle.subscribe((c) => (emitted = c));
    fixture.componentInstance.toggle.emit('TURNOS');
    expect(emitted).toBe('TURNOS');
  });
});
