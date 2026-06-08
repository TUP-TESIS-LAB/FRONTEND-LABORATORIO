import { FormStep } from '@shared/ui/models/form-step';

export type ObraSocialFormStepKey = 'aseguradora' | 'planes' | 'resumen';

export const OBRA_SOCIAL_FORM_STEPS: readonly FormStep<ObraSocialFormStepKey>[] = [
  { key: 'aseguradora', title: 'Aseguradora', subtitle: 'Datos + contacto' },
  { key: 'planes', title: 'Planes y convenios', subtitle: 'Al menos uno' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisar y confirmar' },
] as const;
