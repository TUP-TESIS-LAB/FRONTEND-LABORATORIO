import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DOCTOR_FEATURE_KEY } from './store/doctor.state';
import { doctorReducer } from './store/doctor.reducer';
import { DoctorEffects } from './store/doctor.effects';

export const MEDICOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(DOCTOR_FEATURE_KEY, doctorReducer),
      provideEffects(DoctorEffects),
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/medicos-list/medicos-list.page').then((m) => m.MedicosListPage),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./pages/medico-form/medico-form.page').then((m) => m.MedicoFormPage),
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./pages/medico-form/medico-form.page').then((m) => m.MedicoFormPage),
      },
    ],
  },
];
