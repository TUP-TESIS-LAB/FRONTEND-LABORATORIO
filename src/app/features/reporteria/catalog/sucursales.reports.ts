import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/sucursales';

export const SUCURSALES_REPORTS: ReportDef[] = [
  {
    id: 'R-SUC-02',
    title: 'Sucursales por estado y provincia',
    description: 'Cantidad de sucursales agrupadas por estado y provincia.',
    endpoint: `${BASE}/por-estado-provincia`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['estado', 'provincia', 'cantidad'],
    defaultSort: { field: 'provincia', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'estado', header: 'Estado' },
        { field: 'provincia', header: 'Provincia' },
        { field: 'cantidad', header: 'Sucursales', align: 'right' },
      ],
      ['estado', 'provincia', 'cantidad'],
    ),
  },
  {
    id: 'R-SUC-03',
    title: 'Sucursales sin workspace',
    description: 'Sucursales que todavía no tienen un workspace configurado.',
    endpoint: `${BASE}/sin-workspace`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['codigo', 'descripcion', 'fechaAlta'],
    defaultSort: { field: 'fechaAlta', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'codigo', header: 'Código' },
        { field: 'descripcion', header: 'Nombre' },
        { field: 'estado', header: 'Estado' },
        { field: 'fechaAlta', header: 'Fecha de alta', type: 'date' },
      ],
      ['codigo', 'descripcion', 'fechaAlta'],
    ),
  },
];
