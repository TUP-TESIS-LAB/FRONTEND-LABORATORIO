import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DOMICILIO_FEATURE_KEY } from './store/home-visit.state';
import { homeVisitReducer } from './store/home-visit.reducer';
import { HomeVisitEffects } from './store/home-visit.effects';

export const DOMICILIO_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(DOMICILIO_FEATURE_KEY, homeVisitReducer),
      provideEffects(HomeVisitEffects),
    ],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/agenda/agenda.page').then((m) => m.AgendaPage),
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./pages/nueva-visita/nueva-visita.page').then((m) => m.NuevaVisitaPage),
      },
    ],
  },
];
