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
  /**
   * Indica si el empleado tiene firma cargada. El base64 NO viaja en el listado/get
   * (era un leak de seguridad): se pide aparte al endpoint admin `/{id}/signature`.
   */
  hasSignature: boolean;
}

/** Respuesta del endpoint admin `GET /sucursales/employees/{id}/signature`. */
export interface EmployeeSignature {
  /** Firma como base64 PNG dataURL, o null si el empleado no tiene firma cargada. */
  signature: string | null;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration?: string | null;
  userId?: number | null;
  address?: Address | null;
  /** Firma del bioquímico como base64 PNG dataURL (solo si es bioquímico). */
  signature?: string | null;
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
