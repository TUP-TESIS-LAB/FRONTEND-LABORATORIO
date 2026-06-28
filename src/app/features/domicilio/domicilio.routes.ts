import { Routes } from '@angular/router';

export const DOMICILIO_ROUTES: Routes = [
  {
    path: '',
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
