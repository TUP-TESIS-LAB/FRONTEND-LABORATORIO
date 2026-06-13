import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore, provideState, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authTokenInterceptor } from '@core/interceptors/auth-token.interceptor';
import { tenantIdInterceptor } from '@core/interceptors/tenant-id.interceptor';
import { etagInterceptor } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';
import { loadTenantConfig } from '@core/tenant/store/tenant.actions';
import { loadMySections } from '@core/access/store/access.actions';
import { BranchBootstrapService } from '@core/branch/branch-bootstrap.service';
import { metaReducers } from '@core/store/logger.meta-reducer';

import { TENANT_FEATURE_KEY } from '@core/tenant/store/tenant.state';
import { tenantReducer } from '@core/tenant/store/tenant.reducer';
import { TenantEffects } from '@core/tenant/store/tenant.effects';

import { EMPRESA_FEATURE_KEY } from '@features/empresa/store/empresa.state';
import { empresaReducer } from '@features/empresa/store/empresa.reducer';
import { EmpresaEffects } from '@features/empresa/store/empresa.effects';

import { SUCURSALES_FEATURE_KEY } from '@features/sucursales/store/sucursales.state';
import { sucursalesReducer } from '@features/sucursales/store/sucursales.reducer';
import { SucursalesEffects } from '@features/sucursales/store/sucursales.effects';

import { ANALITICA_FEATURE_KEY } from '@features/analitica/store/analitica.state';
import { analiticaReducer } from '@features/analitica/store/analitica.reducer';
import { AnaliticaEffects } from '@features/analitica/store/analitica.effects';

import { ATENCION_FEATURE_KEY } from '@features/analitica/store/atencion/atencion.state';
import { atencionReducer } from '@features/analitica/store/atencion/atencion.reducer';
import { AtencionEffects } from '@features/analitica/store/atencion/atencion.effects';

// Turnos stores son provistos por turnos.routes.ts (per-feature: queue, agendas,
// appointments, totem). EXCEPCIÓN: branchTotemConfig se registra en root (abajo)
// porque el sidebar —montado en todas las rutas— lee su selector y dispara su
// load aun fuera de Turnos; si viviera solo en el lazy route, NgRx warnea
// ("feature does not exist") y el load del sidebar no tendría effect que lo atienda.
import { branchTotemConfigReducer } from '@features/turnos/store/branch-totem-config/branch-totem-config.reducer';
import { BranchTotemConfigEffects } from '@features/turnos/store/branch-totem-config/branch-totem-config.effects';

import { FINANCIERO_FEATURE_KEY } from '@features/financiero/store/financiero.state';
import { financieroReducer } from '@features/financiero/store/financiero.reducer';
import { FinancieroEffects } from '@features/financiero/store/financiero.effects';

import { PATIENT_FEATURE_KEY } from '@features/pacientes/store/patient.state';
import { patientReducer } from '@features/pacientes/store/patient.reducer';
import { PatientEffects } from '@features/pacientes/store/patient.effects';

import { SAAS_ADMIN_FEATURE_KEY } from '@features/saas-admin/store/saas-admin.state';
import { saasAdminReducer } from '@features/saas-admin/store/saas-admin.reducer';
import { SaasAdminEffects } from '@features/saas-admin/store/saas-admin.effects';

import { EXTRACTION_FEATURE_KEY } from '@features/analitica/store/extraction/extraction.state';
import { extractionReducer } from '@features/analitica/store/extraction/extraction.reducer';
import { ExtractionEffects } from '@features/analitica/store/extraction/extraction.effects';

import { ACCESS_FEATURE_KEY } from '@core/access/store/access.state';
import { accessReducer } from '@core/access/store/access.reducer';
import { AccessEffects } from '@core/access/store/access.effects';

import { ROLES_PERMISOS_FEATURE_KEY } from '@features/roles-permisos/store/roles-permisos.state';
import { rolesPermisosReducer } from '@features/roles-permisos/store/roles-permisos.reducer';
import { RolesPermisosEffects } from '@features/roles-permisos/store/roles-permisos.effects';

import { MUESTRAS_FEATURE_KEY } from '@features/analitica/muestras/store/muestras.state';
import { muestrasReducer } from '@features/analitica/muestras/store/muestras.reducer';
import { MuestrasEffects } from '@features/analitica/muestras/store/muestras.effects';

import { WORKSHEET_TEMPLATES_FEATURE_KEY } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.state';
import { worksheetTemplatesReducer } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.reducer';
import { WorksheetTemplatesEffects } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // On bootstrap, if there's already a valid token (e.g. page refresh),
    // kick off tenant config loading so the resolver at `/` doesn't block
    // waiting for a dispatch.
    provideAppInitializer(() => {
      const tokens = inject(TokenService);
      const store = inject(Store);
      const branchBootstrap = inject(BranchBootstrapService);
      if (tokens.isTokenValid() && !tokens.getRoles().includes('SAAS_ADMIN')) {
        store.dispatch(loadTenantConfig());
        store.dispatch(loadMySections());
        // No bloqueamos el boot: si la resolución de sucursal falla, las
        // pantallas dependientes muestran fallback ("Sin sucursal").
        branchBootstrap.init().subscribe();
      }
    }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([etagInterceptor, authTokenInterceptor, tenantIdInterceptor]),
    ),
    provideStore({}, { metaReducers }),
    provideEffects([]),
    provideRouterStore(),
    provideState(TENANT_FEATURE_KEY, tenantReducer),
    provideEffects(TenantEffects),
    provideState(EMPRESA_FEATURE_KEY, empresaReducer),
    provideEffects(EmpresaEffects),
    provideState(SUCURSALES_FEATURE_KEY, sucursalesReducer),
    provideEffects(SucursalesEffects),
    provideState(ANALITICA_FEATURE_KEY, analiticaReducer),
    provideEffects(AnaliticaEffects),
    provideState(ATENCION_FEATURE_KEY, atencionReducer),
    provideEffects(AtencionEffects),
    provideState(FINANCIERO_FEATURE_KEY, financieroReducer),
    provideEffects(FinancieroEffects),
    provideState(PATIENT_FEATURE_KEY, patientReducer),
    provideEffects(PatientEffects),
    provideState(SAAS_ADMIN_FEATURE_KEY, saasAdminReducer),
    provideEffects(SaasAdminEffects),
    provideState(EXTRACTION_FEATURE_KEY, extractionReducer),
    provideEffects(ExtractionEffects),
    provideState(ACCESS_FEATURE_KEY, accessReducer),
    provideEffects(AccessEffects),
    provideState(ROLES_PERMISOS_FEATURE_KEY, rolesPermisosReducer),
    provideEffects(RolesPermisosEffects),
    provideState(MUESTRAS_FEATURE_KEY, muestrasReducer),
    provideEffects(MuestrasEffects),
    provideState(WORKSHEET_TEMPLATES_FEATURE_KEY, worksheetTemplatesReducer),
    provideEffects(WorksheetTemplatesEffects),
    // Slice de turnos registrada en root a propósito (ver comentario arriba).
    provideState('branchTotemConfig', branchTotemConfigReducer),
    provideEffects(BranchTotemConfigEffects),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          // Disable PrimeNG's automatic dark-mode selector. By default it
          // toggles on `.p-dark` or matches the OS preference, which paints
          // labels and inputs with a dark fill on Windows users running in
          // dark mode. Pin to a selector that never applies.
          darkModeSelector: '.app-dark-mode-disabled',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind, primeng',
          },
        },
      },
    }),
  ],
};
