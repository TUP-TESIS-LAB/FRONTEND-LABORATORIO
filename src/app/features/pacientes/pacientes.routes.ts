import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/patient-list/patient-list.page').then((m) => m.PatientListPage),
  },
  {
    path: 'nuevo',
    data: { breadcrumb: 'Nuevo paciente' },
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id/editar',
    data: { breadcrumb: 'Editar paciente' },
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id',
    data: { breadcrumb: 'Detalle' },
    loadComponent: () =>
      import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
  },
];
