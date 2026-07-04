import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DOMICILIO_FEATURE_KEY } from './store/home-visit.state';
import { homeVisitReducer } from './store/home-visit.reducer';
import { HomeVisitEffects } from './store/home-visit.effects';
import { sectionGuard } from '@core/guards/section.guard';
import { hasRoleGuard } from '@core/guards/has-role.guard';

// Nota de gating:
// El padre (/domicilio) solo gatéa por módulo activo (ver app.routes.ts).
// Cada ruta hija declara su propio sectionGuard para que secretaría (DOMICILIO)
// y extractor (DOMICILIO_RUTA) puedan acceder a sus pantallas sin bloquearse
// mutuamente.

export const DOMICILIO_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(DOMICILIO_FEATURE_KEY, homeVisitReducer),
      provideEffects(HomeVisitEffects),
    ],
    children: [
      { path: '', canMatch: [hasRoleGuard(['EXTRACTOR'])], redirectTo: 'mi-ruta', pathMatch: 'full' },
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      {
        path: 'agenda',
        canMatch: [sectionGuard('DOMICILIO')],
        loadComponent: () =>
          import('./pages/agenda/agenda.page').then((m) => m.AgendaPage),
      },
      {
        path: 'nueva',
        canMatch: [sectionGuard('DOMICILIO')],
        loadComponent: () =>
          import('./pages/nueva-visita/nueva-visita.page').then((m) => m.NuevaVisitaPage),
      },
      {
        path: 'mi-ruta',
        canMatch: [sectionGuard('DOMICILIO_RUTA'), hasRoleGuard(['EXTRACTOR', 'ADMINISTRADOR'])],
        loadComponent: () =>
          import('./pages/mi-ruta/mi-ruta.page').then((m) => m.MiRutaPage),
      },
      {
        // Placeholder — implementado en Task 8 (VisitaDetallePage real).
        // La ruta se define aquí para que el build no falle cuando MiRutaPage
        // navega a /domicilio/mi-ruta/:id.
        path: 'mi-ruta/:id',
        canMatch: [sectionGuard('DOMICILIO_RUTA'), hasRoleGuard(['EXTRACTOR', 'ADMINISTRADOR'])],
        loadComponent: () =>
          import('./pages/visita-detalle/visita-detalle.page').then((m) => m.VisitaDetallePage),
      },
    ],
  },
];
