import { FormStep } from '@shared/ui/models/form-step';

export type SucursalFormStepKey =
  | 'datos' | 'horarios' | 'contactos' | 'workspaces' | 'totem' | 'confirmar';

export type SucursalFormStep = FormStep<SucursalFormStepKey>;

export const SUCURSAL_FORM_STEPS: readonly SucursalFormStep[] = [
  { key: 'datos', title: 'Datos', required: true },
  { key: 'horarios', title: 'Horarios', required: false },
  { key: 'contactos', title: 'Contactos', required: false },
  { key: 'workspaces', title: 'Workspaces', required: false },
  { key: 'totem', title: 'Tótem', required: false },
  { key: 'confirmar', title: 'Confirmar', required: false },
] as const;
