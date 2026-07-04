import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { OBRA_SOCIAL_FEATURE_KEY } from './store/obra-social.state';
import { obraSocialReducer } from './store/obra-social.reducer';
import { ObraSocialEffects } from './store/obra-social.effects';

export const OBRAS_SOCIALES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(OBRA_SOCIAL_FEATURE_KEY, obraSocialReducer),
      provideEffects(ObraSocialEffects),
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/obras-sociales-list/obras-sociales-list.page').then((m) => m.ObrasSocialesListPage),
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./pages/obra-social-form/obra-social-form.page').then((m) => m.ObraSocialFormPage),
      },
      {
        path: ':id',
        data: { breadcrumb: 'Detalle' },
        loadComponent: () =>
          import('./pages/obra-social-detail/obra-social-detail.page').then((m) => m.ObraSocialDetailPage),
      },
    ],
  },
];
