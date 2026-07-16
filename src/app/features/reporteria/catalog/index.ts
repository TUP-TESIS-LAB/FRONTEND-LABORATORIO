import { ReportDef, ReportGroup } from '../models/report.model';
import { PACIENTES_REPORTS } from './pacientes.reports';
import { MEDICOS_REPORTS } from './medicos.reports';
import { EMPLEADOS_REPORTS } from './empleados.reports';
import { SUCURSALES_REPORTS } from './sucursales.reports';
import { USUARIOS_REPORTS } from './usuarios.reports';

/** Catálogo de los 12 reportes (KAN-244), agrupados por módulo del negocio. */
export const REPORT_GROUPS: ReportGroup[] = [
  { key: 'pacientes', label: 'Pacientes', reports: PACIENTES_REPORTS },
  { key: 'medicos', label: 'Médicos derivantes', reports: MEDICOS_REPORTS },
  { key: 'empleados', label: 'Empleados', reports: EMPLEADOS_REPORTS },
  { key: 'sucursales', label: 'Sucursales', reports: SUCURSALES_REPORTS },
  { key: 'usuarios', label: 'Usuarios externos', reports: USUARIOS_REPORTS },
];

export const ALL_REPORTS: ReportDef[] = REPORT_GROUPS.flatMap((g) => g.reports);

export function findReportById(id: string): ReportDef | undefined {
  return ALL_REPORTS.find((r) => r.id === id);
}
