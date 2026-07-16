import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/medicos';

export const MEDICOS_REPORTS: ReportDef[] = [
  {
    id: 'R-MED-02',
    title: 'Altas de médicos por período',
    description: 'Médicos derivantes dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-por-periodo`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['periodo'],
    defaultSort: { field: 'periodo', direction: 'DESC' },
    filters: [
      {
        key: 'granularidad', label: 'Granularidad', type: 'select',
        options: [
          { label: 'Mensual', value: 'MES' },
          { label: 'Anual', value: 'ANIO' },
        ],
      },
    ],
    columns: withSortableColumns(
      [
        { field: 'periodo', header: 'Período' },
        { field: 'cantidadAltas', header: 'Cantidad de altas', align: 'right' },
      ],
      ['periodo'],
    ),
    // Serie temporal (D3/D4). Médicos NO acepta branchId (D2.1: DoctorJpaEntity no
    // tiene sucursal) — branchFilterable queda ausente/false a propósito.
    variation: [{ field: 'variacion' }],
  },
  {
    id: 'R-MED-03',
    title: 'Médicos por especialidad',
    description: 'Cantidad de médicos derivantes agrupados por especialidad.',
    endpoint: `${BASE}/por-especialidad`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['especialidad', 'cantidad'],
    defaultSort: { field: 'cantidad', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'especialidad', header: 'Especialidad' },
        { field: 'cantidad', header: 'Médicos', align: 'right' },
      ],
      ['especialidad', 'cantidad'],
    ),
  },
];
