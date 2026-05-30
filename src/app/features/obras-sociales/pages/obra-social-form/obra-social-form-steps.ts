export type ObraSocialFormStepKey = 'aseguradora' | 'planes' | 'resumen';

export interface ObraSocialFormStep {
  readonly key: ObraSocialFormStepKey;
  readonly title: string;
  readonly subtitle: string;
}

export const OBRA_SOCIAL_FORM_STEPS: readonly ObraSocialFormStep[] = [
  { key: 'aseguradora', title: 'Aseguradora', subtitle: 'Datos + contacto' },
  { key: 'planes', title: 'Planes y convenios', subtitle: 'Al menos uno' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisar y confirmar' },
] as const;
