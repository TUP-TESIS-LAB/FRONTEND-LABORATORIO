import { FormStep } from '@shared/ui/models/form-step';

export type PatientFormStepKey = 'general' | 'coverages' | 'summary';
export type PatientFormStep = FormStep<PatientFormStepKey>;

// La dirección dejó de ser un paso propio: sus campos viven dentro de "Datos generales".
export const PATIENT_FORM_STEPS: readonly PatientFormStep[] = [
  { key: 'general', title: 'Datos generales', subtitle: 'Identidad, contacto y domicilio', required: true },
  { key: 'coverages', title: 'Obras sociales', subtitle: 'Coberturas', required: false },
  { key: 'summary', title: 'Resumen', subtitle: 'Revisar y confirmar', required: false },
] as const;
