import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/medicos';

export const MEDICOS_REPORTS: ReportDef[] = [
  {
    id: 'R-MED-01',
    title: 'Listado de médicos derivantes',
    description: 'Listado general de médicos derivantes con matrícula y especialidad.',
    endpoint: `${BASE}/listado`,
    roles: ROLES,
    sortableFields: ['lastName', 'licenseNumber'],
    defaultSort: { field: 'lastName', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'licenseNumber', header: 'Matrícula' },
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'specialtyName', header: 'Especialidad' },
        { field: 'phone', header: 'Teléfono' },
        { field: 'email', header: 'Email' },
      ],
      ['lastName', 'licenseNumber'],
    ),
  },
  {
    id: 'R-MED-02',
    title: 'Altas de médicos por período',
    description: 'Médicos derivantes dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas`,
    roles: ROLES,
    sortableFields: ['createdAt'],
    defaultSort: { field: 'createdAt', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'licenseNumber', header: 'Matrícula' },
        { field: 'createdAt', header: 'Fecha de alta' },
      ],
      ['createdAt'],
    ),
  },
  {
    id: 'R-MED-03',
    title: 'Médicos por especialidad',
    description: 'Cantidad de médicos derivantes agrupados por especialidad.',
    endpoint: `${BASE}/por-especialidad`,
    roles: ROLES,
    sortableFields: ['specialtyName', 'doctorCount'],
    defaultSort: { field: 'doctorCount', direction: 'DESC' },
    filters: [
      // Texto libre en vez de select: el catálogo de especialidades no está
      // disponible como lista estática en el frontend hoy.
      { key: 'specialtyName', label: 'Especialidad', type: 'text' },
    ],
    columns: withSortableColumns(
      [
        { field: 'specialtyName', header: 'Especialidad' },
        { field: 'doctorCount', header: 'Médicos', align: 'right' },
      ],
      ['specialtyName', 'doctorCount'],
    ),
  },
];
