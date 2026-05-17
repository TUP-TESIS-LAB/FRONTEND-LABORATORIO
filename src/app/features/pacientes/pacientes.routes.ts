import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/patient-list/patient-list.page').then((m) => m.PatientListPage),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
  },
];
