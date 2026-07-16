import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
  production: boolean;
  version: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config$: Observable<AppConfig> | null = null;

  constructor(private http: HttpClient) {}

  load(): Observable<AppConfig> {
    if (!this.config$) {
      this.config$ = this.http
        .get<AppConfig>('/assets/app-config.json')
        .pipe(shareReplay(1));
    }
    return this.config$;
  }
}
