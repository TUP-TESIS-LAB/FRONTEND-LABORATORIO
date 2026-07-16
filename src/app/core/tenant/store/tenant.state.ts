import { HttpErrorResponse } from '@angular/common/http';
import { TenantConfig } from '@core/models/tenant.model';

export interface TenantState {
  config: TenantConfig | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialTenantState: TenantState = {
  config: null,
  pending: false,
  error: null,
};

export const TENANT_FEATURE_KEY = 'tenant';
