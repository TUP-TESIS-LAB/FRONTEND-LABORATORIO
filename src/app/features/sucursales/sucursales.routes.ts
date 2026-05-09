import { Routes } from '@angular/router';
import { SucursalesService } from './services/sucursales.service';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    providers: [SucursalesService],
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      { path: 'lista', loadComponent: () => import('./pages/sucursales/sucursales.component').then(m => m.SucursalesPageComponent) },
      { path: 'areas', loadComponent: () => import('./pages/areas/areas.component').then(m => m.AreasComponent) },
    ],
  },
];
