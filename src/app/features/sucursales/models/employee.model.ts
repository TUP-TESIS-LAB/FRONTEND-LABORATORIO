import { Address } from './address.model';

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
  address?: Address | null;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration?: string | null;
  userId?: number | null;
  address?: Address | null;
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
