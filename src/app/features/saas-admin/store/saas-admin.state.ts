import { HttpErrorResponse } from '@angular/common/http';
import { Tenant } from '../models/tenant.model';
import { ModuleCode } from '../models/module-code';
import { TenantWhiteLabel } from '../models/tenant-white-label.model';
import { TenantFiscalConfig } from '../models/tenant-fiscal-config.model';

export const SAAS_ADMIN_FEATURE_KEY = 'saasAdmin';

export interface SaasAdminState {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  selectedTenantModules: ModuleCode[] | null;
  selectedTenantWhiteLabel: TenantWhiteLabel | null;
  selectedTenantFiscalConfig: TenantFiscalConfig | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialSaasAdminState: SaasAdminState = {
  tenants: [],
  selectedTenant: null,
  selectedTenantModules: null,
  selectedTenantWhiteLabel: null,
  selectedTenantFiscalConfig: null,
  pending: false,
  error: null,
};
