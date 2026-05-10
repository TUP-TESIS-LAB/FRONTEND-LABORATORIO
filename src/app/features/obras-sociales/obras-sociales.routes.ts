import { Routes } from '@angular/router';

export const OBRAS_SOCIALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/obras-sociales/obras-sociales.page').then(m => m.ObrasSocialesPage),
  },
];
