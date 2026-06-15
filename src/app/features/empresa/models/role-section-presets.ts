import { AccessSection } from '@core/access/access.model';

/** Secciones que pre-marca cada rol al elegirlo en el drawer. Defaults editables por el admin. */
export const ROLE_SECTION_PRESETS: Record<string, AccessSection[]> = {
  ADMINISTRADOR: [
    'RECEPCION', 'PACIENTES', 'AGENDAS', 'MEDICOS', 'PREANALITICA', 'ANALITICA',
    'POSTANALITICA', 'EXTRACCIONES', 'EMPRESA', 'SUCURSALES', 'OBRAS_SOCIALES', 'FINANCIERO', 'STOCK',
  ],
  SECRETARIA: ['RECEPCION', 'PACIENTES', 'AGENDAS', 'OBRAS_SOCIALES'],
  RESPONSABLE_SECRETARIA: ['RECEPCION', 'PACIENTES', 'AGENDAS', 'OBRAS_SOCIALES', 'FINANCIERO', 'SUCURSALES', 'EMPRESA'],
  FACTURISTA: ['FINANCIERO', 'OBRAS_SOCIALES', 'PACIENTES'],
  EXTRACTOR: ['EXTRACCIONES', 'RECEPCION'],
  TECNICO_LABORATORIO: ['PREANALITICA', 'ANALITICA', 'EXTRACCIONES'],
  BIOQUIMICO: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA', 'PACIENTES'],
  MANAGER_STOCK: ['STOCK'],
  EXTERNO: [],
};

/** Preset del rol ∩ secciones grantable del tenant (si un módulo no está activo, su sección se descarta). */
export function presetForRole(roleCode: string, grantable: AccessSection[]): AccessSection[] {
  const preset = ROLE_SECTION_PRESETS[roleCode] ?? [];
  const allowed = new Set(grantable);
  return preset.filter((s) => allowed.has(s));
}
