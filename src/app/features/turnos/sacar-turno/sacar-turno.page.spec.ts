import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { SacarTurnoPage } from './sacar-turno.page';
import { SACAR_TURNO_FEATURE_KEY, initialSacarTurnoState } from './store/sacar-turno.state';
import { Patient } from '@features/pacientes/models/patient.model';

const PATIENT: Patient = {
  id: 1,
  dni: '30111222',
  firstName: 'Juan',
  lastName: 'Pérez',
  birthDate: null,
  gender: null,
  sexAtBirth: null,
  status: 'MIN',
  source: 'STAFF',
  verifiedAt: null,
  contacts: [],
  addresses: [],
  coverages: [],
  active: true,
  accountStatus: 'NONE',
};

function setup() {
  TestBed.configureTestingModule({
    imports: [SacarTurnoPage],
    providers: [
      provideMockStore({
        initialState: { [SACAR_TURNO_FEATURE_KEY]: initialSacarTurnoState },
      }),
      provideRouter([]),
      provideNoopAnimations(),
      MessageService,
    ],
  });
  const fixture = TestBed.createComponent(SacarTurnoPage);
  fixture.detectChanges();
  return fixture;
}

describe('SacarTurnoPage', () => {
  it('el wizard queda en 3 pasos, con "datos-generales" primero', () => {
    const fixture = setup();
    const page = fixture.componentInstance as any;

    expect(page.steps.map((s: { key: string }) => s.key))
      .toEqual(['datos-generales', 'analisis', 'confirmar']);
  });

  it('no permite avanzar de "datos-generales" si falta algún dato', () => {
    const fixture = setup();
    const page = fixture.componentInstance as any;

    expect(page.canProceed()).toBe(false);
  });

  it('permite avanzar de "datos-generales" con paciente+sucursal+fecha+hora completos', () => {
    const fixture = setup();
    const page = fixture.componentInstance as any;

    page.selectedPatient.set(PATIENT);
    page.selectedBranchId.set(5);
    page.selectedFecha.set(new Date());
    page.selectedHora.set('09:00');
    fixture.detectChanges();

    expect(page.canProceed()).toBe(true);
  });

  it('el paso "analisis" siempre permite avanzar (opcional)', () => {
    const fixture = setup();
    const page = fixture.componentInstance as any;

    page.currentStep.set(1);
    fixture.detectChanges();

    expect(page.currentKey()).toBe('analisis');
    expect(page.canProceed()).toBe(true);
  });
});
