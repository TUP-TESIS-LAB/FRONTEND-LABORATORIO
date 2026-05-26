import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchContact, BranchContactCreateInput } from '../models/branch-contact.model';

@Injectable({ providedIn: 'root' })
export class BranchContactService {
  private readonly http = inject(HttpClient);

  private base(branchId: number): string {
    return `/api/v1/sucursales/branches/${branchId}/contacts`;
  }

  list(branchId: number): Observable<BranchContact[]> {
    return this.http.get<BranchContact[]>(this.base(branchId));
  }

  create(branchId: number, input: BranchContactCreateInput): Observable<BranchContact> {
    return this.http.post<BranchContact>(this.base(branchId), input);
  }

  update(branchId: number, id: number, input: BranchContactCreateInput): Observable<BranchContact> {
    return this.http.put<BranchContact>(`${this.base(branchId)}/${id}`, input);
  }

  delete(branchId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(branchId)}/${id}`);
  }
}
