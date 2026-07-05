import { EventConfig } from '../../models/notificaciones-config.model';
import {
  excludedRefsOf,
  roleCodesOf,
  userRefsOf,
} from './components/recipients-editor/recipients-editor.logic';

export type StatusFilter = 'all' | 'active';

export interface SelectOption {
  label: string;
  value: string;
}

/** Etiquetas en español por sección/módulo (`requiredSection` del backend). */
const SECTION_LABELS: Record<string, string> = {
  RECEPCION: 'Recepción',
  PACIENTES: 'Pacientes',
  AGENDAS: 'Agendas',
  MEDICOS: 'Médicos',
  PREANALITICA: 'Preanalítica',
  ANALITICA: 'Analítica',
  POSTANALITICA: 'Postanalítica',
  EXTRACCIONES: 'Extracciones',
  EMPRESA: 'Empresa',
  SUCURSALES: 'Sucursales',
  OBRAS_SOCIALES: 'Obras sociales',
  FINANCIERO: 'Financiero',
  STOCK: 'Stock',
  DOMICILIO: 'Domicilio',
  DOMICILIO_RUTA: 'Domicilio (ruta)',
  URGENCIAS: 'Urgencias',
};

/** Etiqueta en español de una sección; fallback: prettify del código crudo (sin leak). */
export function moduleLabel(section: string): string {
  if (SECTION_LABELS[section]) return SECTION_LABELS[section];
  if (!section) return 'Sin módulo';
  const lower = section.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Opciones del filtro Módulo: "Todos" + las secciones presentes, ordenadas por etiqueta. */
export function moduleOptions(configs: EventConfig[]): SelectOption[] {
  const sections = [...new Set(configs.map((c) => c.section))]
    .map((s) => ({ label: moduleLabel(s), value: s }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  return [{ label: 'Todos los módulos', value: 'all' }, ...sections];
}

/** Filtro cliente: búsqueda por título + módulo + solo-activos. */
export function filterConfigs(
  configs: EventConfig[],
  filters: { search: string; module: string; status: StatusFilter },
): EventConfig[] {
  const term = filters.search.trim().toLowerCase();
  return configs.filter((c) => {
    if (filters.status === 'active' && !c.enabled) return false;
    if (filters.module !== 'all' && c.section !== filters.module) return false;
    if (term && !c.title.toLowerCase().includes(term)) return false;
    return true;
  });
}

/** Resumen de destinatarios para la columna colapsada. Vacío si no hay ninguno. */
export function recipientsSummary(config: EventConfig): string {
  const roles = roleCodesOf(config.recipients).length;
  const users = userRefsOf(config.recipients).length;
  const excluded = excludedRefsOf(config.recipients).length;

  const parts: string[] = [];
  if (roles) parts.push(`${roles} ${roles === 1 ? 'rol' : 'roles'}`);
  if (users) parts.push(`${users} ${users === 1 ? 'usuario' : 'usuarios'}`);

  let summary = parts.join(' · ');
  if (excluded) summary += `${summary ? ' ' : ''}(−${excluded})`;
  return summary;
}
