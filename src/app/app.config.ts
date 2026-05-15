import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore, provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authTokenInterceptor } from '@core/interceptors/auth-token.interceptor';
import { tenantIdInterceptor } from '@core/interceptors/tenant-id.interceptor';

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

import { TURNOS_FEATURE_KEY } from '@features/turnos/store/turnos.state';
import { turnosReducer } from '@features/turnos/store/turnos.reducer';
import { TurnosEffects } from '@features/turnos/store/turnos.effects';

import { FINANCIERO_FEATURE_KEY } from '@features/financiero/store/financiero.state';
import { financieroReducer } from '@features/financiero/store/financiero.reducer';
import { FinancieroEffects } from '@features/financiero/store/financiero.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authTokenInterceptor, tenantIdInterceptor]),
    ),
    provideStore({}),
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
    provideState(TURNOS_FEATURE_KEY, turnosReducer),
    provideEffects(TurnosEffects),
    provideState(FINANCIERO_FEATURE_KEY, financieroReducer),
    provideEffects(FinancieroEffects),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind, primeng',
          },
        },
      },
    }),
  ],
};
