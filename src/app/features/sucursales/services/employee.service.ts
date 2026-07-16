import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput,
  EmployeeSignature, UpdateEmployeeRequest,
} from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/sucursales/employees';

  list(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.baseUrl);
  }
  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }
  /**
   * Firma (base64 PNG dataURL) de un empleado. Endpoint admin-only: el base64 NO viaja en
   * el listado/get general por seguridad. Devuelve `{ signature: null }` si no tiene firma.
   */
  getSignature(id: number): Observable<EmployeeSignature> {
    return this.http.get<EmployeeSignature>(`${this.baseUrl}/${id}/signature`);
  }
  create(req: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, req);
  }
  update(id: number, req: UpdateEmployeeRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, req);
  }
  toggleStatus(id: number): Observable<Employee> {
    return this.http.patch<Employee>(`${this.baseUrl}/${id}/status`, {});
  }

  listContacts(employeeId: number): Observable<EmployeeContact[]> {
    return this.http.get<EmployeeContact[]>(`${this.baseUrl}/${employeeId}/contacts`);
  }
  addContact(employeeId: number, input: EmployeeContactInput): Observable<EmployeeContact> {
    return this.http.post<EmployeeContact>(`${this.baseUrl}/${employeeId}/contacts`, input);
  }
  updateContact(employeeId: number, contactId: number, input: EmployeeContactInput): Observable<EmployeeContact> {
    return this.http.put<EmployeeContact>(`${this.baseUrl}/${employeeId}/contacts/${contactId}`, input);
  }
  removeContact(employeeId: number, contactId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${employeeId}/contacts/${contactId}`);
  }
}
