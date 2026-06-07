import { FormStep } from '@shared/ui/models/form-step';

export const EMPLOYEE_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre, documento y matrícula' },
  { key: 'contactos', title: 'Contactos', subtitle: 'Email, teléfono (opcional)' },
  { key: 'direccion', title: 'Dirección', subtitle: 'Domicilio (opcional)' },
  { key: 'usuario', title: 'Usuario', subtitle: 'Acceso al sistema (opcional)' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
