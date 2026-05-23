export type PatientFormStepKey = 'general' | 'coverages' | 'contact-address';

export interface PatientFormStep {
  readonly key: PatientFormStepKey;
  readonly title: string;
  readonly subtitle: string;
  readonly required: boolean;
}

export const PATIENT_FORM_STEPS: readonly PatientFormStep[] = [
  { key: 'general', title: 'Datos generales', subtitle: 'Identidad del paciente', required: true },
  { key: 'coverages', title: 'Coberturas', subtitle: 'Obras sociales · opcional', required: false },
  { key: 'contact-address', title: 'Contacto & Dirección', subtitle: 'Cómo ubicarlo · opcional', required: false },
] as const;
