import { FormStep } from '@shared/ui/models/form-step';

/**
 * Pasos base del alta/edición de empleado. El paso `firma` es condicional —
 * solo aplica a bioquímicos — y se inserta entre `usuario` y `resumen` por
 * `buildEmployeeFormSteps(isBiochemist)`. Esta constante refleja el caso sin
 * firma (no bioquímico).
 */
export const EMPLOYEE_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos generales', subtitle: 'Identidad, contacto y domicilio' },
  { key: 'usuario', title: 'Usuario', subtitle: 'Acceso al sistema (opcional)' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;

const FIRMA_STEP: FormStep = { key: 'firma', title: 'Firma', subtitle: 'Firma del bioquímico' };

/**
 * Construye los pasos del wizard según el rol. Si `isBiochemist`, inserta el
 * paso `firma` entre `usuario` y `resumen`; si no, devuelve los pasos base.
 * Los índices quedan siempre contiguos para que el stepper y la navegación por
 * índice del wizard sigan funcionando sin cambios.
 */
export function buildEmployeeFormSteps(isBiochemist: boolean): readonly FormStep[] {
  if (!isBiochemist) return EMPLOYEE_FORM_STEPS;
  const steps = [...EMPLOYEE_FORM_STEPS];
  const resumenIndex = steps.findIndex((s) => s.key === 'resumen');
  steps.splice(resumenIndex, 0, FIRMA_STEP);
  return steps;
}
