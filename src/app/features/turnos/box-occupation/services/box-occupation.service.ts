import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BoxOccupation, BoxType, OccupyBoxInput } from '../models/box-occupation.model';

@Injectable({ providedIn: 'root' })
export class BoxOccupationService {
  private http = inject(HttpClient);

  list(branchId: number, type: BoxType): Observable<BoxOccupation[]> {
    return this.http.get<BoxOccupation[]>(
      `/api/v1/sucursales/branches/${branchId}/box-occupations`,
      { params: { type } },
    );
  }

  occupy(branchId: number, input: OccupyBoxInput): Observable<BoxOccupation> {
    return this.http.put<BoxOccupation>(
      `/api/v1/sucursales/branches/${branchId}/box-occupations/me`,
      input,
    );
  }

  release(branchId: number, type: BoxType): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/sucursales/branches/${branchId}/box-occupations/me`,
      { params: { type } },
    );
  }
}
