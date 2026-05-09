import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';
import { TenantConfig, TenantState } from '@core/models/tenant.model';
import { ModuleKey } from '@core/models/module-key.enum';

const initialState: TenantState = {
  config: null,
  loading: false,
  error: null,
};

export const TenantStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => ({
    loadConfig: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          http.get<TenantConfig>('/api/tenant/config').pipe(
            tap((config) => patchState(store, { config, loading: false })),
            catchError((err: { message: string }) => {
              patchState(store, { error: err.message, loading: false });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
    isActive(key: ModuleKey): boolean {
      return store.config()?.modules.includes(key) ?? false;
    },
  })),
);
