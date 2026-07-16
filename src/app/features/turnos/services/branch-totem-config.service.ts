import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchTotemConfig, UpsertBranchTotemConfigRequest } from '../models/branch-totem-config.model';

@Injectable({ providedIn: 'root' })
export class BranchTotemConfigService {
  private http = inject(HttpClient);
  private base = '/api/v1/sucursales/branches';

  get(branchId: number): Observable<BranchTotemConfig> {
    return this.http.get<BranchTotemConfig>(`${this.base}/${branchId}/totem-config`);
  }

  update(branchId: number, body: UpsertBranchTotemConfigRequest): Observable<BranchTotemConfig> {
    return this.http.put<BranchTotemConfig>(`${this.base}/${branchId}/totem-config`, body);
  }
}
