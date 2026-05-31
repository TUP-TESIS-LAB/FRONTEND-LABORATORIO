import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EmpleadosListPage } from './empleados-list.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { loadEmployees } from '../../store/employee.actions';
import { Employee } from '../../models/employee.model';

const emp: Employee = { id: 8, firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: 'B-1', userId: null, active: true };

describe('EmpleadosListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadosListPage],
      providers: [
        provideMockStore({ initialState: { [EMPLOYEE_FEATURE_KEY]: { ...initialEmployeeState, items: [emp] } } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadEmployees on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(EmpleadosListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadEmployees());
  });

  it('renders the employee row and a link to edit', () => {
    const fixture = TestBed.createComponent(EmpleadosListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Ruiz, Eva');
    expect(html).toMatch(/href="[^"]*\/sucursales\/empleados\/8\/editar"/);
  });
});
