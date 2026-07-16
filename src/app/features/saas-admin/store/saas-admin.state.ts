import { HttpErrorResponse } from '@angular/common/http';
import { Tenant } from '../models/tenant.model';
import { ModuleCode } from '../models/module-code';
import { TenantWhiteLabel } from '../models/tenant-white-label.model';

export const SAAS_ADMIN_FEATURE_KEY = 'saasAdmin';

export interface SaasAdminState {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  selectedTenantModules: ModuleCode[] | null;
  selectedTenantWhiteLabel: TenantWhiteLabel | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialSaasAdminState: SaasAdminState = {
  tenants: [],
  selectedTenant: null,
  selectedTenantModules: null,
  selectedTenantWhiteLabel: null,
  pending: false,
  error: null,
};
