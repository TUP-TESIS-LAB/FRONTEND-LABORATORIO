import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MedicosListPage } from './medicos-list.page';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from '../../store/doctor.state';
import { loadDoctors, toggleDoctorStatus } from '../../store/doctor.actions';
import { Doctor } from '../../models/doctor.model';

const doc: Doctor = { id: 5, firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL', active: true };

describe('MedicosListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicosListPage],
      providers: [
        provideMockStore({ initialState: { [DOCTOR_FEATURE_KEY]: { ...initialDoctorState, items: [doc] } } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadDoctors on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(MedicosListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadDoctors());
  });

  it('renders the doctor row and a link to edit', () => {
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Gómez, Ana');
    expect(html).toMatch(/href="[^"]*\/medicos\/5\/editar"/);
  });

  it('confirmToggle dispatches toggleDoctorStatus on accept', () => {
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['store'].dispatch(toggleDoctorStatus({ id: doc.id }));
    expect(spy).toHaveBeenCalledWith(toggleDoctorStatus({ id: 5 }));
  });
});
