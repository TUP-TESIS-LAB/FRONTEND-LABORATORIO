import { FormStep } from '@shared/ui/models/form-step';

export const DOCTOR_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos profesionales', subtitle: 'Nombre, matrícula, especialidad' },
  { key: 'contacto', title: 'Contacto y dirección', subtitle: 'Email, teléfono, domicilio' },
  { key: 'firma', title: 'Firma', subtitle: 'Firma del médico (opcional)' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
