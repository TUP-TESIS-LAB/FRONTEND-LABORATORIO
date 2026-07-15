// Etiquetas en español (única fuente de verdad) para enums de paciente.
// Regla #4: nada de enums crudos en inglés/mayúsculas en la UI — siempre pasar por acá.
import { Gender, PatientStatus, SexAtBirth } from './patient.model';

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
  NOT_SPECIFIED: 'No especificado',
};

export const SEX_LABEL: Record<SexAtBirth, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
};

export const STATUS_LABEL: Record<PatientStatus, string> = {
  MIN: 'Incompleto',
  COMPLETE: 'Completo',
  VERIFIED: 'Verificado',
};

/** Opciones para los <p-select> del stepper, derivadas del mapa de labels. */
export const GENDER_OPTS: { value: Gender; label: string }[] =
  (Object.keys(GENDER_LABEL) as Gender[]).map((value) => ({ value, label: GENDER_LABEL[value] }));

export const SEX_OPTS: { value: SexAtBirth; label: string }[] =
  (Object.keys(SEX_LABEL) as SexAtBirth[]).map((value) => ({ value, label: SEX_LABEL[value] }));

export function genderLabel(g: Gender | null | undefined): string {
  return g ? GENDER_LABEL[g] ?? '—' : '—';
}

export function sexLabel(s: SexAtBirth | null | undefined): string {
  return s ? SEX_LABEL[s] ?? '—' : '—';
}

export function statusLabel(s: PatientStatus | null | undefined): string {
  return s ? STATUS_LABEL[s] ?? s : '—';
}
