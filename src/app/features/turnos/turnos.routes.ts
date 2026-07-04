import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { queueReducer } from './store/queue/queue.reducer';
import { QueueEffects } from './store/queue/queue.effects';
import { appointmentsReducer } from './store/appointments/appointments.reducer';
import { AppointmentsEffects } from './store/appointments/appointments.effects';
// branchTotemConfig se registra en el store root (app.config.ts), no acá: el
// sidebar lo usa en todas las rutas. No re-registrar para no duplicar la slice.
import { agendasReducer } from './store/agendas/agendas.reducer';
import { AgendasEffects } from './store/agendas/agendas.effects';
import { totemReducer } from './store/totem/totem.reducer';
import { TotemEffects } from './store/totem/totem.effects';
import { recepcionAccessGuard } from './guards/recepcion-access.guard';
import { agendaWriteGuard } from './guards/agenda-write.guard';
import { agendaConfigResolver } from './resolvers/agenda-config.resolver';
import { BOX_OCCUPATION_FEATURE_KEY } from './box-occupation/store/box-occupation.state';
import { boxOccupationReducer } from './box-occupation/store/box-occupation.reducer';
import { BoxOccupationEffects } from './box-occupation/store/box-occupation.effects';
import { SACAR_TURNO_FEATURE_KEY } from './sacar-turno/store/sacar-turno.state';
import { sacarTurnoReducer } from './sacar-turno/store/sacar-turno.reducer';
import { SacarTurnoEffects } from './sacar-turno/store/sacar-turno.effects';

export const TURNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      MessageService,
      provideState('queue', queueReducer),
      provideState('appointments', appointmentsReducer),
      provideState('agendas', agendasReducer),
      provideState('totem', totemReducer),
      provideEffects([QueueEffects, AppointmentsEffects, AgendasEffects, TotemEffects]),
    ],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda',         data: { breadcrumb: 'Agenda de turnos' }, loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      {
        // Sacar turno en nombre del paciente (secretaria). Gateado por módulo
        // Turnos vía el canMatch del padre en app.routes. Store propia scopeada.
        path: 'sacar',
        title: 'Sacar turno',
        data: { breadcrumb: 'Sacar turno' },
        providers: [
          provideState(SACAR_TURNO_FEATURE_KEY, sacarTurnoReducer),
          provideEffects([SacarTurnoEffects]),
        ],
        loadComponent: () => import('./sacar-turno/sacar-turno.page').then(m => m.SacarTurnoPage),
      },
      {
        path: 'configuracion',
        data: { breadcrumb: 'Configuración de agendas' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/configuracion/configuracion-list.page').then(
                m => m.ConfiguracionListPage,
              ),
          },
          {
            path: 'nueva',
            canActivate: [agendaWriteGuard],
            loadComponent: () =>
              import('./pages/configuracion/agenda-wizard/agenda-wizard.page').then(m => m.AgendaWizardPage),
          },
          {
            path: ':id/editar',
            canActivate: [agendaWriteGuard],
            resolve: { agenda: agendaConfigResolver },
            loadComponent: () =>
              import('./pages/configuracion/agenda-wizard/agenda-wizard.page').then(m => m.AgendaWizardPage),
          },
        ],
      },
      { path: 'atencion-turno', data: { breadcrumb: 'Atención de turno' }, loadComponent: () => import('./pages/atencion-turno/atencion-turno.component').then(m => m.AtencionTurnoComponent) },
      {
        path: 'recepcion',
        canActivate: [recepcionAccessGuard],
        data: { breadcrumb: 'Recepción' },
        providers: [
          provideState(BOX_OCCUPATION_FEATURE_KEY, boxOccupationReducer),
          provideEffects([BoxOccupationEffects]),
        ],
        loadComponent: () => import('./pages/recepcion/recepcion.page').then(m => m.RecepcionPage),
      },
      // colas se elimina.
    ],
  },
];
