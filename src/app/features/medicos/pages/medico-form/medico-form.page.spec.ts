import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MedicoFormPage } from './medico-form.page';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from '../../store/doctor.state';
import { addDoctor } from '../../store/doctor.actions';

describe('MedicoFormPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicoFormPage],
      providers: [
        provideMockStore({ initialState: { [DOCTOR_FEATURE_KEY]: initialDoctorState } }),
        provideMockActions(() => of()),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders "Nuevo médico derivante" in create mode', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo médico derivante');
  });

  it('does not submit while the Datos step is invalid', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: addDoctor.type }));
  });

  it('dispatches addDoctor on submit when Datos is valid and on last step', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({
      firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL',
      specialty: '', institution: '',
    });
    cmp.goNext(); // contacto
    cmp.goNext(); // firma
    cmp.goNext(); // resumen (último)
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addDoctor({
      req: {
        firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL',
        specialty: null, institution: null, email: null, phone: null, signature: null, address: null,
      },
    }));
  });

  it('includes a structured address when a street is provided', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({
      firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL',
      specialty: 'Cardiología', institution: '',
    });
    cmp.contactoGroup.setValue({ email: '', phone: '', street: 'Av. Corrientes', streetNumber: '1234' });
    cmp.goNext(); cmp.goNext(); cmp.goNext();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addDoctor({
      req: {
        firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL',
        specialty: 'Cardiología', institution: null, email: null, phone: null, signature: null,
        address: { street: 'Av. Corrientes', streetNumber: '1234' },
      },
    }));
  });
});
