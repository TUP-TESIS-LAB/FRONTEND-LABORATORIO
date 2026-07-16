import { ModuleKey } from './module-key.enum';

export interface TenantConfig {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  modules: ModuleKey[];
}
