import { Routes } from '@angular/router';
import { FinancieroService } from './services/financiero.service';

export const FINANCIERO_ROUTES: Routes = [
  {
    path: '',
    providers: [FinancieroService],
    children: [
      { path: '', redirectTo: 'pagos', pathMatch: 'full' },
      { path: 'pagos',         loadComponent: () => import('./pages/pagos/pagos.component').then(m => m.PagosComponent) },
      { path: 'cajas',         loadComponent: () => import('./pages/cajas/cajas.component').then(m => m.CajasComponent) },
      { path: 'movimientos',   loadComponent: () => import('./pages/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
      { path: 'coberturas',    loadComponent: () => import('./pages/coberturas/coberturas.component').then(m => m.CoberturasComponent) },
      { path: 'liquidaciones', loadComponent: () => import('./pages/liquidaciones/liquidaciones.component').then(m => m.LiquidacionesComponent) },
    ],
  },
];
