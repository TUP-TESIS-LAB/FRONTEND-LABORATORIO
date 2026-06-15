import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { EmpleadoFormPage } from './empleado-form.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { addEmployee, createEmployeeWithUser } from '../../store/employee.actions';

const RESUMEN_STEP = 2;

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

  function fillDatos(cmp: EmpleadoFormPage, isBiochemist = false, extra: Partial<{ email: string; mobile: string }> = {}): void {
    cmp.datosGroup.setValue({
      firstName: 'Eva', lastName: 'Ruiz', document: '30111222', registration: '', isBiochemist,
      email: extra.email ?? '', mobile: extra.mobile ?? '',
    });
  }

  it('renders "Nuevo empleado" in create mode', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo empleado');
  });

  it('the wizard has exactly 3 steps', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    expect(fixture.componentInstance.steps.map((s) => s.key)).toEqual(['datos', 'usuario', 'resumen']);
  });

  it('dispatches addEmployee (no user, no address) with no contacts when contact fields are empty', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp);
    cmp.currentStep.set(RESUMEN_STEP);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: { firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null, address: null },
      contacts: [],
    }));
  });

  it('maps email -> EMAIL and celular -> MOBILE contacts', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp, false, { email: 'eva@x.com', mobile: '2211234567' });
    cmp.currentStep.set(RESUMEN_STEP);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: { firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null, address: null },
      contacts: [{ contactType: 'EMAIL', value: 'eva@x.com' }, { contactType: 'MOBILE', value: '2211234567' }],
    }));
  });

  it('includes the full free-text address (street, number, neighborhood, city, province)', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp);
    cmp.direccionGroup.setValue({ street: 'Av. Mitre', streetNumber: '500', neighborhood: 'Centro', city: 'La Plata', province: 'Buenos Aires' });
    cmp.currentStep.set(RESUMEN_STEP);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: {
        firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: false, registration: null,
        address: { street: 'Av. Mitre', streetNumber: '500', neighborhood: 'Centro', city: 'La Plata', province: 'Buenos Aires' },
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
    cmp.currentStep.set(RESUMEN_STEP);
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
      newUser: { firstName: 'Eva', lastName: 'Ruiz', email: 'eva@x.com', username: 'eruiz', document: '30111222', roleId: 3, branchId: 8 },
      sections: ['RECEPCION'],
    });
    cmp.currentStep.set(RESUMEN_STEP);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(createEmployeeWithUser({
      userPayload: {
        firstName: 'Eva', lastName: 'Ruiz', email: 'eva@x.com', username: 'eruiz', document: '30111222',
        roleIds: [3], sections: ['RECEPCION'], branchId: 8,
      },
      req: {
        firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: null, address: null,
      },
      contacts: [],
    }));
  });

  it('exposes datos identity (firstName/lastName/document) for user preload, without email', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp, false, { email: 'eva@x.com' });
    expect(cmp.usuarioPreload()).toEqual({ firstName: 'Eva', lastName: 'Ruiz', document: '30111222' });
  });

  it('new user sin sucursal no permite submit', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    fillDatos(cmp, true);
    cmp.usuarioGroup.patchValue({
      mode: 'new',
      newUser: { firstName: 'Eva', lastName: 'Ruiz', email: 'eva@x.com', username: 'eruiz', document: '30111222', roleId: 3, branchId: null },
      sections: ['RECEPCION'],
    });
    cmp.currentStep.set(RESUMEN_STEP);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: createEmployeeWithUser.type }));
  });

  it('does not submit while Datos is invalid', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: addEmployee.type }));
  });
});
