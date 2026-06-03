import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessSection, SectionResponse } from '@core/access/access.model';

@Injectable({ providedIn: 'root' })
export class RolesPermisosApiService {
  private readonly http = inject(HttpClient);

  getGrantable(): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>('/api/v1/access-sections');
  }

  getUserSections(userId: number): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>(`/api/v1/user/${userId}/access-sections`);
  }

  setUserSections(userId: number, sections: AccessSection[]): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${userId}/access-sections`, { sections });
  }
}
