import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';
import { Action } from '@ngrx/store';
import { MedicosListPage } from './medicos-list.page';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from '../../store/doctor.state';
import { loadDoctors, toggleDoctorStatus, addDoctor, addDoctorSuccess } from '../../store/doctor.actions';
import { CreateDoctorRequest, Doctor } from '../../models/doctor.model';

const doc: Doctor = { id: 5, firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL', active: true };
const req: CreateDoctorRequest = {
  firstName: 'Beto', lastName: 'Díaz', tuition: 'MN2', registrationType: 'NACIONAL',
  specialty: null, email: null, phone: null,
};

describe('MedicosListPage (smoke)', () => {
  let store: MockStore;
  let actions$: Subject<Action>;

  function configure() {
    actions$ = new Subject<Action>();
    TestBed.configureTestingModule({
      imports: [MedicosListPage],
      providers: [
        provideMockStore({ initialState: { [DOCTOR_FEATURE_KEY]: { ...initialDoctorState, items: [doc] } } }),
        provideMockActions(() => actions$),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  }

  it('dispatches loadDoctors on init', () => {
    configure();
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(MedicosListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadDoctors());
  });

  it('renders the doctor row and the edit action button', () => {
    configure();
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.innerHTML).toContain('Gómez, Ana');
    expect(el.querySelector('[aria-label="Editar"]')).toBeTruthy();
  });

  it('openDrawer opens the quick-add drawer', () => {
    configure();
    const cmp = TestBed.createComponent(MedicosListPage).componentInstance;
    expect(cmp.drawerOpen()).toBe(false);
    cmp.openDrawer();
    expect(cmp.drawerOpen()).toBe(true);
  });

  it('onCreate dispatches addDoctor and closes the drawer on success', () => {
    configure();
    const cmp = TestBed.createComponent(MedicosListPage).componentInstance;
    cmp.openDrawer();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onCreate(req);
    expect(spy).toHaveBeenCalledWith(addDoctor({ req }));
    actions$.next(addDoctorSuccess({ doctor: doc }));
    expect(cmp.drawerOpen()).toBe(false);
  });

  it('onCreateAndNext keeps the drawer open and bumps resetToken on success', () => {
    configure();
    const cmp = TestBed.createComponent(MedicosListPage).componentInstance;
    cmp.openDrawer();
    const tokenBefore = cmp.resetToken();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onCreateAndNext(req);
    expect(spy).toHaveBeenCalledWith(addDoctor({ req }));
    actions$.next(addDoctorSuccess({ doctor: doc }));
    expect(cmp.drawerOpen()).toBe(true);
    expect(cmp.resetToken()).toBe(tokenBefore + 1);
  });

  it('confirmToggle dispatches toggleDoctorStatus on accept', () => {
    configure();
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance['store'].dispatch(toggleDoctorStatus({ id: doc.id }));
    expect(spy).toHaveBeenCalledWith(toggleDoctorStatus({ id: 5 }));
  });
});
