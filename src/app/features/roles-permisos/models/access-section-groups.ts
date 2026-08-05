import { AccessSection } from '@core/access/access.model';

export interface SectionGroup {
  label: string;
  sections: AccessSection[];
}

/**
 * Orden y agrupación visual del checklist, espejando los folders del sidebar
 * (Recepción / Clínico / Gestión). Solo presentación: el set que se manda es plano.
 */
export const SECTION_GROUPS: SectionGroup[] = [
  { label: 'Recepción', sections: ['RECEPCION', 'PACIENTES', 'AGENDAS', 'MEDICOS'] },
  { label: 'Clínico', sections: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA', 'EXTRACCIONES'] },
  { label: 'Domicilio', sections: ['DOMICILIO', 'DOMICILIO_RUTA'] },
  { label: 'Gestión', sections: ['EMPRESA', 'SUCURSALES', 'OBRAS_SOCIALES', 'FINANCIERO', 'STOCK'] },
];

/**
 * Toda sección concedible tiene que estar en algún grupo: el checklist recorre
 * SECTION_GROUPS y descarta lo que no encuentre, así que una sección ausente acá
 * es invisible para el administrador aunque el backend la ofrezca.
 */
export const GROUPED_SECTIONS: ReadonlySet<AccessSection> = new Set(
  SECTION_GROUPS.flatMap((g) => g.sections),
);
