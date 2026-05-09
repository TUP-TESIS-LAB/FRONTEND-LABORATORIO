import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, take, tap } from 'rxjs';
import { TenantConfig } from '@core/models/tenant.model';
import { TenantThemeService } from './tenant-theme.service';
import { loadTenantConfig } from './store/tenant.actions';
import { selectTenantConfig } from './store/tenant.selectors';

export const tenantResolver: ResolveFn<TenantConfig | null> = () => {
  const store = inject(Store);
  const themeService = inject(TenantThemeService);

  store.dispatch(loadTenantConfig());

  return store.select(selectTenantConfig).pipe(
    filter((config): config is TenantConfig => config !== null),
    take(1),
    tap(config => themeService.applyTheme(config)),
  );
};
