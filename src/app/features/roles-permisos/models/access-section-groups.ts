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
  { label: 'Gestión', sections: ['EMPRESA', 'SUCURSALES', 'OBRAS_SOCIALES', 'FINANCIERO', 'STOCK'] },
];
