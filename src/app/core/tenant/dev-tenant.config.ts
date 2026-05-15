import { TenantConfig } from '@core/models/tenant.model';
import { ModuleKey } from '@core/models/module-key.enum';

// DEV fallback: backend has no `GET /api/tenant/config` endpoint yet.
// Seeded into the tenant store on app bootstrap (when a valid token is
// present) and on login success so the tenant resolver at `/` doesn't
// hang waiting for a config that never arrives. Remove once the real
// endpoint is implemented.
export const DEV_TENANT: TenantConfig = {
  id: 'dev-tenant',
  name: 'LaboratoApp',
  logoUrl: '',
  brandPrimary:   '#1d4ed8',
  brandSecondary: '#0ea5a4',
  brandAccent:    '#f97316',
  modules: [
    ModuleKey.Turnos,
    ModuleKey.Financiero,
    ModuleKey.Medicos,
    ModuleKey.Stock,
    ModuleKey.Portal,
  ],
};
