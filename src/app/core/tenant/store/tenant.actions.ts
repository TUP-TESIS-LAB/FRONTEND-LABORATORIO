import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantConfig } from '@core/models/tenant.model';

export const loadTenantConfig = createAction(
  '[Tenant Resolver] Load Tenant Config',
);

export const loadTenantConfigSuccess = createAction(
  '[Tenant API] Load Tenant Config Success',
  props<{ config: TenantConfig }>(),
);

export const loadTenantConfigFailure = createAction(
  '[Tenant API] Load Tenant Config Failure',
  props<{ error: HttpErrorResponse }>(),
);
