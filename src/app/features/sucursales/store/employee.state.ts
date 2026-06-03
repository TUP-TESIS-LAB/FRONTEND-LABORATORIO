import { HttpErrorResponse } from '@angular/common/http';
import { Employee, EmployeeContact } from '../models/employee.model';

export interface EmployeeState {
  items: Employee[];
  selected: Employee | null;
  selectedContacts: EmployeeContact[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialEmployeeState: EmployeeState = {
  items: [],
  selected: null,
  selectedContacts: [],
  pending: false,
  error: null,
};

export const EMPLOYEE_FEATURE_KEY = 'employees';
