import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { EmpleadoFormPage } from './empleado-form.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { addEmployee, createEmployeeWithUser } from '../../store/employee.actions';

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

  function fillDatos(cmp: EmpleadoFormPage, isBiochemist = false): void {
    cmp.datosGroup.setValue({ firstName: 'Eva', lastName: 'Ruiz', document: '30111222', registration: '', isBiochemist });
  }

  it('renders "Nuevo empleado" in create mode', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo empleado');
  });

  it('dispatches addEmployee (no user, no address) with contacts on submit', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp);
    cmp.contactosArray.push(
      (cmp as unknown as { contactGroup: (r: unknown) => unknown })['contactGroup']({ contactType: 'EMAIL', value: 'eva@x.com' }) as never,
    );
    cmp.currentStep.set(4); // resumen (último)
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: { firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null, address: null },
      contacts: [{ contactType: 'EMAIL', value: 'eva@x.com' }],
    }));
  });

  it('includes a structured address when a street is provided', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp);
    cmp.direccionGroup.setValue({ street: 'Av. Mitre', streetNumber: '500' });
    cmp.currentStep.set(4);
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

  it('links an existing user (userId in the request)', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp);
    cmp.usuarioGroup.get('mode')!.setValue('existing');
    cmp.usuarioGroup.get('existingUserId')!.setValue(77);
    cmp.currentStep.set(4);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: {
        firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null,
        address: null, userId: 77,
      },
      contacts: [],
    }));
  });

  it('creates a new user and delegates the employee creation', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp, true);
    cmp.usuarioGroup.patchValue({
      mode: 'new',
      newUser: { firstName: 'Eva', lastName: 'Ruiz', email: 'eva@x.com', username: 'eruiz', document: '30111222', roleId: 3 },
      sections: ['ATENCION'],
    });
    cmp.currentStep.set(4);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(createEmployeeWithUser({
      userPayload: {
        firstName: 'Eva', lastName: 'Ruiz', email: 'eva@x.com', username: 'eruiz', document: '30111222',
        roleIds: [3], sections: ['ATENCION'],
      },
      req: {
        firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: null, address: null,
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
