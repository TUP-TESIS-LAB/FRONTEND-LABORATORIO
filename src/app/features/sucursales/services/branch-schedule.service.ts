import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchSchedule, BranchScheduleCreateInput } from '../models/branch-schedule.model';

@Injectable({ providedIn: 'root' })
export class BranchScheduleService {
  private readonly http = inject(HttpClient);

  private base(branchId: number): string {
    return `/api/v1/sucursales/branches/${branchId}/schedules`;
  }

  list(branchId: number): Observable<BranchSchedule[]> {
    return this.http.get<BranchSchedule[]>(this.base(branchId));
  }

  create(branchId: number, input: BranchScheduleCreateInput): Observable<BranchSchedule> {
    return this.http.post<BranchSchedule>(this.base(branchId), input);
  }

  update(branchId: number, id: number, input: BranchScheduleCreateInput): Observable<BranchSchedule> {
    return this.http.put<BranchSchedule>(`${this.base(branchId)}/${id}`, input);
  }

  delete(branchId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(branchId)}/${id}`);
  }
}
