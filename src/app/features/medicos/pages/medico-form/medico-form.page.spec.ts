import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
    cmp.datosGroup.setValue({ firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL' });
    cmp.goNext();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addDoctor({
      req: { firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL' },
    }));
  });
});
