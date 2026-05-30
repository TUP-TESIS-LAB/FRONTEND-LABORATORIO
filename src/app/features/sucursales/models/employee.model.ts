export type EmployeeContactType = 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration: string | null;
  userId: number | null;
  active: boolean;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration?: string | null;
}

export type UpdateEmployeeRequest = CreateEmployeeRequest;

export interface EmployeeContact {
  id: number;
  employeeId: number;
  contactType: EmployeeContactType;
  value: string;
}

export interface EmployeeContactInput {
  contactType: EmployeeContactType;
  value: string;
}
