import { FormStep } from '@shared/ui/components/form-stepper-header/form-step';

export type SucursalFormStepKey =
  | 'datos' | 'horarios' | 'contactos' | 'workspaces' | 'totem' | 'confirmar';

export type SucursalFormStep = FormStep<SucursalFormStepKey>;

export const SUCURSAL_FORM_STEPS: readonly SucursalFormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Información básica', required: true },
  { key: 'horarios', title: 'Horarios', subtitle: 'Días y franjas de atención', required: false },
  { key: 'contactos', title: 'Contactos', subtitle: 'Email, teléfonos, WhatsApp', required: false },
  { key: 'workspaces', title: 'Workspaces', subtitle: 'Áreas y secciones', required: false },
  { key: 'totem', title: 'Tótem', subtitle: 'Habilitar walk-in', required: false },
  { key: 'confirmar', title: 'Confirmar', subtitle: 'Revisar y crear', required: false },
] as const;
