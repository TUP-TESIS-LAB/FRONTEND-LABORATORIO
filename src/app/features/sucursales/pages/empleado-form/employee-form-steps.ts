import { FormStep } from '@shared/ui/models/form-step';

export const EMPLOYEE_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos generales', subtitle: 'Identidad, contacto y domicilio' },
  { key: 'usuario', title: 'Usuario', subtitle: 'Acceso al sistema (opcional)' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
