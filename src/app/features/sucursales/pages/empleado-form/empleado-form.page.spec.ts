import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { EmpleadoFormPage } from './empleado-form.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { addEmployee } from '../../store/employee.actions';

describe('EmpleadoFormPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadoFormPage],
      providers: [
        provideMockStore({ initialState: { [EMPLOYEE_FEATURE_KEY]: initialEmployeeState } }),
        provideMockActions(() => of()),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders "Nuevo empleado" in create mode', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo empleado');
  });

  it('dispatches addEmployee with datos and contacts on submit (last step, valid)', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({ firstName: 'Eva', lastName: 'Ruiz', document: '30111222', registration: 'B-1', isBiochemist: true });
    cmp.goNext();
    cmp.contactosArray.push(
      (cmp as unknown as { contactGroup: (r: unknown) => unknown })['contactGroup']({ contactType: 'EMAIL', value: 'eva@x.com' }) as never,
    );
    cmp.goNext(); // direccion
    cmp.goNext(); // resumen (último)
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: { firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: 'B-1', address: null },
      contacts: [{ contactType: 'EMAIL', value: 'eva@x.com' }],
    }));
  });

  it('includes a structured address when a street is provided', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({ firstName: 'Eva', lastName: 'Ruiz', document: '30111222', registration: '', isBiochemist: false });
    cmp.direccionGroup.setValue({ street: 'Av. Mitre', streetNumber: '500' });
    cmp.goNext(); cmp.goNext(); cmp.goNext();
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: {
        firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null,
        address: { street: 'Av. Mitre', streetNumber: '500' },
      },
      contacts: [],
    }));
  });

  it('does not submit while Datos is invalid', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: addEmployee.type }));
  });
});
