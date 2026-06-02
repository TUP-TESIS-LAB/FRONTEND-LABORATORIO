import { AccessSection } from '@core/access/access.model';

export interface SectionGroup {
  label: string;
  sections: AccessSection[];
}

/** Orden y agrupación visual del checklist. Solo presentación: el set que se manda es plano. */
export const SECTION_GROUPS: SectionGroup[] = [
  { label: 'Atención', sections: ['ATENCION', 'EXTRACCIONES'] },
  { label: 'Analítica', sections: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA'] },
  { label: 'Pacientes', sections: ['PACIENTES'] },
  { label: 'Turnos', sections: ['TURNOS'] },
  { label: 'Financiero', sections: ['FINANCIERO', 'OBRAS_SOCIALES'] },
  { label: 'Stock', sections: ['STOCK'] },
  { label: 'Portal', sections: ['PORTAL'] },
  { label: 'Sucursales', sections: ['SUCURSALES'] },
];
