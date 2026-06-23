import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { PortalAccessDialogComponent } from './portal-access-dialog.component';
import { PatientService } from '../../../pacientes/services/patient.service';
import { createPatientPortalAccount } from '../../../pacientes/store/patient.actions';
import { registerGuardian } from '../../store/atencion/atencion.actions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePatient(overrides: object = {}) {
  return {
    id: 99,
    dni: '30000000',
    firstName: 'Ana',
    lastName: 'Gómez',
    contacts: [{ contactType: 'EMAIL', contactValue: 'ana@example.com', isPrimary: true, active: true }],
    ...overrides,
  };
}

// ── Spec ─────────────────────────────────────────────────────────────────────

describe('PortalAccessDialogComponent', () => {
  let store: MockStore;
  let patientServiceSpy: {
    existsByDni: ReturnType<typeof vi.fn>;
    getByDni: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    patientServiceSpy = {
      existsByDni: vi.fn(),
      getByDni: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PortalAccessDialogComponent],
      providers: [
        provideMockStore(),
        provideNoopAnimations(),
        { provide: PatientService, useValue: patientServiceSpy },
      ],
    });

    store = TestBed.inject(MockStore);
  });

  // ── (a) Rama propio ──────────────────────────────────────────────────────────

  describe('Rama propio', () => {
    it('confirmar dispatches createPatientPortalAccount con el patientId', () => {
      const spy = vi.spyOn(store, 'dispatch');
      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 7);
      fixture.componentRef.setInput('patientHasEmail', true);
      fixture.detectChanges();

      c.selectModo('propio');
      c.confirmPropio();

      expect(spy).toHaveBeenCalledWith(createPatientPortalAccount({ id: 7 }));
    });

    it('confirmPropio emite closed', () => {
      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 7);
      fixture.componentRef.setInput('patientHasEmail', true);
      fixture.detectChanges();

      let emitted = false;
      c.closed.subscribe(() => (emitted = true));

      c.selectModo('propio');
      c.confirmPropio();

      expect(emitted).toBe(true);
    });
  });

  // ── (b) Rama responsable ─────────────────────────────────────────────────────

  describe('Rama responsable — DNI existente', () => {
    it('lookupDni con DNI existente prefilla firstName y lastName', async () => {
      patientServiceSpy.existsByDni.mockReturnValue(of(true));
      patientServiceSpy.getByDni.mockReturnValue(of(makePatient()));

      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 42);
      fixture.componentRef.setInput('patientHasEmail', false);
      fixture.detectChanges();

      c.selectModo('responsable');
      c.setDni('30000000');
      await c.lookupDni();

      expect(c.firstName()).toBe('Ana');
      expect(c.lastName()).toBe('Gómez');
    });

    it('lookupDni con DNI existente + contacto EMAIL prefilla email', async () => {
      patientServiceSpy.existsByDni.mockReturnValue(of(true));
      patientServiceSpy.getByDni.mockReturnValue(of(makePatient()));

      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 42);
      fixture.componentRef.setInput('patientHasEmail', false);
      fixture.detectChanges();

      c.selectModo('responsable');
      c.setDni('30000000');
      await c.lookupDni();

      expect(c.email()).toBe('ana@example.com');
    });

    it('confirmar responsable dispatches registerGuardian con los campos correctos', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      patientServiceSpy.existsByDni.mockReturnValue(of(true));
      patientServiceSpy.getByDni.mockReturnValue(of(makePatient()));

      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 42);
      fixture.componentRef.setInput('patientHasEmail', false);
      fixture.detectChanges();

      c.selectModo('responsable');
      c.setDni('30000000');
      await c.lookupDni();
      c.setBond('MADRE');
      c.confirmResponsable();

      expect(dispatchSpy).toHaveBeenCalledWith(
        registerGuardian({
          firstName: 'Ana',
          lastName: 'Gómez',
          email: 'ana@example.com',
          document: '30000000',
          patientId: 42,
          bond: 'MADRE',
        }),
      );
    });

    it('confirmResponsable emite closed', async () => {
      patientServiceSpy.existsByDni.mockReturnValue(of(true));
      patientServiceSpy.getByDni.mockReturnValue(of(makePatient()));

      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('patientId', 42);
      fixture.componentRef.setInput('patientHasEmail', false);
      fixture.detectChanges();

      let emitted = false;
      c.closed.subscribe(() => (emitted = true));

      c.selectModo('responsable');
      c.setDni('30000000');
      await c.lookupDni();
      c.setBond('PADRE');
      c.confirmResponsable();

      expect(emitted).toBe(true);
    });
  });

  // ── (c) Dropdown de vínculo excluye PROPIO ────────────────────────────────────

  describe('Vínculos disponibles', () => {
    it('bonds NO contiene PROPIO', () => {
      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.detectChanges();

      expect(c.bonds).not.toContain('PROPIO');
    });

    it('bonds contiene los vínculos familiares esperados', () => {
      const fixture = TestBed.createComponent(PortalAccessDialogComponent);
      const c = fixture.componentInstance;
      fixture.detectChanges();

      expect(c.bonds).toContain('MADRE');
      expect(c.bonds).toContain('PADRE');
      expect(c.bonds).toContain('TUTOR');
      expect(c.bonds).toContain('OTROS');
    });
  });
});
