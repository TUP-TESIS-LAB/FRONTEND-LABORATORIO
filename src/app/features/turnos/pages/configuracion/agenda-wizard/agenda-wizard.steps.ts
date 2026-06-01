import { FormStep } from '@shared/ui/models/form-step';

export type AgendaWizardStepKey = 'sucursal' | 'horario' | 'periodo' | 'confirmar';

export type AgendaWizardStep = FormStep<AgendaWizardStepKey>;

export const AGENDA_WIZARD_STEPS: readonly AgendaWizardStep[] = [
  { key: 'sucursal', title: 'Sucursal', subtitle: 'Elegir sucursal y tipo', required: true },
  { key: 'horario', title: 'Horario', subtitle: 'Franja + duración del slot', required: true },
  { key: 'periodo', title: 'Período', subtitle: 'Vigencia + recurrencia', required: true },
  { key: 'confirmar', title: 'Confirmar', subtitle: 'Revisar y guardar', required: false },
] as const;
