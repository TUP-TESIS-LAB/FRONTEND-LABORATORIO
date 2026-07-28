import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { MANUAL_FEATURE_KEY } from './store/manual.state';
import { manualReducer } from './store/manual.reducer';
import { ManualEffects } from './store/manual.effects';

/**
 * El centro de ayuda no lleva `sectionGuard` ni `moduleActiveGuard`: cualquier
 * usuario del laboratorio tiene que poder leer el manual, y el backend ya
 * recorta los capítulos a los módulos que tiene activos el tenant.
 */
export const AYUDA_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(MANUAL_FEATURE_KEY, manualReducer),
      provideEffects(ManualEffects),
    ],
    loadComponent: () =>
      import('./pages/centro-ayuda/centro-ayuda.page').then((m) => m.CentroAyudaPage),
  },
];
