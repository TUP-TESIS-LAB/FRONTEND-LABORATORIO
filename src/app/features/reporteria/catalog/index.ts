import { ReportDef, ReportGroup } from '../models/report.model';
import { PACIENTES_REPORTS } from './pacientes.reports';
import { MEDICOS_REPORTS } from './medicos.reports';
import { EMPLEADOS_REPORTS } from './empleados.reports';
import { SUCURSALES_REPORTS } from './sucursales.reports';
import { USUARIOS_REPORTS } from './usuarios.reports';
import { ANALITICA_REPORTS } from './analitica.reports';

/** Catálogo de los 14 reportes (12 de KAN-244 + 2 de KAN-256/adaptación), agrupados por módulo. */
export const REPORT_GROUPS: ReportGroup[] = [
  { key: 'pacientes', label: 'Pacientes', reports: PACIENTES_REPORTS },
  { key: 'medicos', label: 'Médicos derivantes', reports: MEDICOS_REPORTS },
  { key: 'empleados', label: 'Empleados', reports: EMPLEADOS_REPORTS },
  { key: 'sucursales', label: 'Sucursales', reports: SUCURSALES_REPORTS },
  { key: 'usuarios', label: 'Usuarios externos', reports: USUARIOS_REPORTS },
  { key: 'analitica', label: 'Analítica', reports: ANALITICA_REPORTS },
];

export const ALL_REPORTS: ReportDef[] = REPORT_GROUPS.flatMap((g) => g.reports);

export function findReportById(id: string): ReportDef | undefined {
  return ALL_REPORTS.find((r) => r.id === id);
}
