import { Routes } from '@angular/router';

export const ANALITICA_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'atencion', pathMatch: 'full' },
{ path: 'atencion',       loadComponent: () => import('./pages/atencion/atencion.component').then(m => m.AtencionComponent) },
      { path: 'protocolos',     loadComponent: () => import('./pages/protocolos/protocolos.component').then(m => m.ProtocolosComponent) },
      { path: 'rotulos',        loadComponent: () => import('./pages/rotulos/rotulos.component').then(m => m.RotulosComponent) },
      { path: 'pre-analitica',  loadComponent: () => import('./pages/pre-analitica/pre-analitica.component').then(m => m.PreAnaliticaComponent) },
      { path: 'analitica',      loadComponent: () => import('./pages/analitica/analitica-work.component').then(m => m.AnaliticaWorkComponent) },
      { path: 'post-analitica', loadComponent: () => import('./pages/post-analitica/post-analitica.component').then(m => m.PostAnaliticaComponent) },
      { path: 'nbu',            loadComponent: () => import('./pages/nbu/nbu.component').then(m => m.NbuComponent) },
    ],
  },
];
