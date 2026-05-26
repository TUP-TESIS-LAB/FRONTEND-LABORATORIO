import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchWorkspace, BranchWorkspaceCreateInput } from '../models/branch-workspace.model';

@Injectable({ providedIn: 'root' })
export class BranchWorkspaceService {
  private readonly http = inject(HttpClient);

  private base(branchId: number): string {
    return `/api/v1/sucursales/branches/${branchId}/workspaces`;
  }

  list(branchId: number): Observable<BranchWorkspace[]> {
    return this.http.get<BranchWorkspace[]>(this.base(branchId));
  }

  /** Replace-all semantics: sends the full desired set; backend diffs and persists. */
  sync(branchId: number, workspaces: BranchWorkspaceCreateInput[]): Observable<BranchWorkspace[]> {
    return this.http.put<BranchWorkspace[]>(this.base(branchId), { workspaces });
  }
}
