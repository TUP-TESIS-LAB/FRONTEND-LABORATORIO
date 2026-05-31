import {
  selectAllEmployees, selectSelectedEmployee, selectSelectedEmployeeContacts,
  selectEmployeePending, selectEmployeeError,
} from './employee.selectors';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from './employee.state';

describe('employee selectors', () => {
  const state = {
    [EMPLOYEE_FEATURE_KEY]: {
      ...initialEmployeeState,
      items: [{ id: 1 } as never],
      selectedContacts: [{ id: 9 } as never],
      pending: true,
    },
  } as never;

  it('selectAllEmployees returns items', () => {
    expect(selectAllEmployees(state)).toEqual([{ id: 1 }]);
  });
  it('selectSelectedEmployeeContacts returns contacts', () => {
    expect(selectSelectedEmployeeContacts(state)).toEqual([{ id: 9 }]);
  });
  it('selectEmployeePending returns pending', () => {
    expect(selectEmployeePending(state)).toBe(true);
  });
  it('selectEmployeeError returns error', () => {
    expect(selectEmployeeError(state)).toBeNull();
  });
  it('selectSelectedEmployee returns null when none', () => {
    expect(selectSelectedEmployee(state)).toBeNull();
  });
});
