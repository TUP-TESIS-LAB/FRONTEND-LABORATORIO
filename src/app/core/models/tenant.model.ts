import { ModuleKey } from './module-key.enum';

export interface TenantConfig {
  id: string;
  name: string;
  logoUrl: string;
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
  modules: ModuleKey[];
}
