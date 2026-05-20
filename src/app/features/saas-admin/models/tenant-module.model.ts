import { ModuleCode } from './module-code';

export interface TenantModule {
  moduleCode: ModuleCode;
  enabled: boolean;
}

export interface ToggleTenantModuleRequest {
  enable: boolean;
}
