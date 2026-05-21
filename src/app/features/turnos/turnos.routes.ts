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

export const TURNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      MessageService,
      provideState('queue', queueReducer),
      provideState('appointments', appointmentsReducer),
      provideState('branchTotemConfig', branchTotemConfigReducer),
      provideEffects([QueueEffects, AppointmentsEffects, BranchTotemConfigEffects]),
    ],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda',         loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      { path: 'configuracion',  loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
      { path: 'totem',          loadComponent: () => import('./pages/totem/totem.component').then(m => m.TotemComponent) },
      { path: 'atencion-turno', loadComponent: () => import('./pages/atencion-turno/atencion-turno.component').then(m => m.AtencionTurnoComponent) },
      // recepcion va a sumarse en Task 22.
      // colas se elimina.
    ],
  },
];
