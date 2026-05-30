import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SectionResponse } from './access.model';

@Injectable({ providedIn: 'root' })
export class AccessApiService {
  private readonly http = inject(HttpClient);

  getMySections(): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>('/api/v1/me/access-sections');
  }
}
