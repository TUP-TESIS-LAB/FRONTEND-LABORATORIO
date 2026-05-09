import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { tap, filter, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { TenantStore } from './tenant.store';
import { TenantThemeService } from './tenant-theme.service';
import { TenantConfig } from '@core/models/tenant.model';

export const tenantResolver: ResolveFn<TenantConfig | null> = () => {
  const store = inject(TenantStore);
  const themeService = inject(TenantThemeService);

  store.loadConfig();

  return toObservable(store.config).pipe(
    filter((config): config is TenantConfig => config !== null),
    take(1),
    tap((config) => themeService.applyTheme(config)),
  );
};
