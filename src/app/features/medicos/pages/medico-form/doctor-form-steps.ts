import { FormStep } from '@shared/ui/models/form-step';

export const DOCTOR_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre, matrícula y registro' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
