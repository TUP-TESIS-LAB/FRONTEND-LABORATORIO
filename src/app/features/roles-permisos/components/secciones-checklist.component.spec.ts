import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SeccionesChecklistComponent } from './secciones-checklist.component';

describe('SeccionesChecklistComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeccionesChecklistComponent], providers: [provideNoopAnimations()] });
  });

  it('agrupa el catalogo y marca lo del workingSet', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    // RECEPCION cae en el grupo "Recepción" y ANALITICA en "Clínico" → 2 grupos.
    fixture.componentInstance.catalog = [
      { code: 'RECEPCION', label: 'Recepción' },
      { code: 'ANALITICA', label: 'Analítica' },
    ];
    fixture.componentInstance.workingSet = ['ANALITICA'];
    fixture.detectChanges();
    expect(fixture.componentInstance.groups().length).toBe(2);
    expect(fixture.componentInstance.isChecked('ANALITICA')).toBe(true);
    expect(fixture.componentInstance.isChecked('RECEPCION')).toBe(false);
  });

  it('emite toggle con el code', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    fixture.componentInstance.catalog = [{ code: 'AGENDAS', label: 'Turnos' }];
    fixture.componentInstance.workingSet = [];
    let emitted: string | undefined;
    fixture.componentInstance.toggle.subscribe((c) => (emitted = c));
    fixture.componentInstance.toggle.emit('AGENDAS');
    expect(emitted).toBe('AGENDAS');
  });
});
