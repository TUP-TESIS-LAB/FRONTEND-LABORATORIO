import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EMPLOYEE_FEATURE_KEY, EmployeeState } from './employee.state';

export const selectEmployeeState = createFeatureSelector<EmployeeState>(EMPLOYEE_FEATURE_KEY);

export const selectAllEmployees = createSelector(selectEmployeeState, (s) => s.items);
export const selectSelectedEmployee = createSelector(selectEmployeeState, (s) => s.selected);
export const selectSelectedEmployeeContacts = createSelector(selectEmployeeState, (s) => s.selectedContacts);
export const selectEmployeePending = createSelector(selectEmployeeState, (s) => s.pending);
export const selectEmployeeError = createSelector(selectEmployeeState, (s) => s.error);
