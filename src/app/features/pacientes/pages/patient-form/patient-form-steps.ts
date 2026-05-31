import { FormStep } from '@shared/ui/components/form-stepper-header/form-step';

export type PatientFormStepKey = 'general' | 'address' | 'coverages' | 'summary';
export type PatientFormStep = FormStep<PatientFormStepKey>;

export const PATIENT_FORM_STEPS: readonly PatientFormStep[] = [
  { key: 'general', title: 'Datos generales', subtitle: 'Identidad + contacto', required: true },
  { key: 'address', title: 'Dirección', subtitle: 'Domicilio del paciente · opcional', required: false },
  { key: 'coverages', title: 'Coberturas', subtitle: 'Obras sociales · opcional', required: false },
  { key: 'summary', title: 'Resumen', subtitle: 'Revisar y confirmar', required: false },
] as const;
