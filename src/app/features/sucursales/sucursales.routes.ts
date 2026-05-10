import { Routes } from '@angular/router';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      { path: 'lista', loadComponent: () => import('./pages/sucursales/sucursales.component').then(m => m.SucursalesPageComponent) },
      { path: 'areas', loadComponent: () => import('./pages/areas/areas.component').then(m => m.AreasComponent) },
    ],
  },
];
