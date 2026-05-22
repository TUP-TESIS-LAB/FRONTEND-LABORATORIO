import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { queueReducer } from './store/queue/queue.reducer';
import { QueueEffects } from './store/queue/queue.effects';
import { appointmentsReducer } from './store/appointments/appointments.reducer';
import { AppointmentsEffects } from './store/appointments/appointments.effects';
import { branchTotemConfigReducer } from './store/branch-totem-config/branch-totem-config.reducer';
import { BranchTotemConfigEffects } from './store/branch-totem-config/branch-totem-config.effects';
import { agendasReducer } from './store/agendas/agendas.reducer';
import { AgendasEffects } from './store/agendas/agendas.effects';
import { recepcionAccessGuard } from './guards/recepcion-access.guard';
import { agendaWriteGuard } from './guards/agenda-write.guard';
import { agendaConfigResolver } from './resolvers/agenda-config.resolver';

export const TURNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      MessageService,
      provideState('queue', queueReducer),
      provideState('appointments', appointmentsReducer),
      provideState('branchTotemConfig', branchTotemConfigReducer),
      provideState('agendas', agendasReducer),
      provideEffects([QueueEffects, AppointmentsEffects, BranchTotemConfigEffects, AgendasEffects]),
    ],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda',         loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      {
        path: 'configuracion',
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
              import('./pages/configuracion/agenda-wizard.page').then(m => m.AgendaWizardPage),
          },
          {
            path: ':id/editar',
            canActivate: [agendaWriteGuard],
            resolve: { agenda: agendaConfigResolver },
            loadComponent: () =>
              import('./pages/configuracion/agenda-wizard.page').then(m => m.AgendaWizardPage),
          },
        ],
      },
      { path: 'totem',          loadComponent: () => import('./pages/totem/totem.component').then(m => m.TotemComponent) },
      { path: 'atencion-turno', loadComponent: () => import('./pages/atencion-turno/atencion-turno.component').then(m => m.AtencionTurnoComponent) },
      {
        path: 'recepcion',
        canActivate: [recepcionAccessGuard],
        loadComponent: () => import('./pages/recepcion/recepcion.page').then(m => m.RecepcionPage),
      },
      // colas se elimina.
    ],
  },
];
