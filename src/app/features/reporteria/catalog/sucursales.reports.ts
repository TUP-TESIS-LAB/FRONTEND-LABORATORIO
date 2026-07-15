import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/sucursales';

export const SUCURSALES_REPORTS: ReportDef[] = [
  {
    id: 'R-SUC-01',
    title: 'Listado de sucursales',
    description: 'Listado general de sucursales del tenant.',
    endpoint: `${BASE}/listado`,
    roles: ROLES,
    sortableFields: ['code', 'description'],
    defaultSort: { field: 'code', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'code', header: 'Código' },
        { field: 'description', header: 'Nombre' },
        { field: 'province', header: 'Provincia' },
        { field: 'status', header: 'Estado' },
      ],
      ['code', 'description'],
    ),
  },
  {
    id: 'R-SUC-02',
    title: 'Sucursales por estado y provincia',
    description: 'Cantidad de sucursales agrupadas por estado y provincia.',
    endpoint: `${BASE}/por-estado-provincia`,
    roles: ROLES,
    sortableFields: ['province', 'status'],
    defaultSort: { field: 'province', direction: 'ASC' },
    filters: [
      // DATO VERIFICADO: el estado de sucursal es solo ACTIVE/INACTIVE — no existe MAINTENANCE.
      {
        key: 'status', label: 'Estado', type: 'select',
        options: [
          { label: 'Activa', value: 'ACTIVE' },
          { label: 'Inactiva', value: 'INACTIVE' },
        ],
      },
      { key: 'province', label: 'Provincia', type: 'text' },
    ],
    columns: withSortableColumns(
      [
        { field: 'province', header: 'Provincia' },
        { field: 'status', header: 'Estado' },
        { field: 'branchCount', header: 'Sucursales', align: 'right' },
      ],
      ['province', 'status'],
    ),
  },
  {
    id: 'R-SUC-03',
    title: 'Sucursales sin workspace',
    description: 'Sucursales que todavía no tienen un workspace configurado.',
    endpoint: `${BASE}/sin-workspace`,
    roles: ROLES,
    sortableFields: ['createdAt', 'code'],
    defaultSort: { field: 'createdAt', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'code', header: 'Código' },
        { field: 'description', header: 'Nombre' },
        { field: 'province', header: 'Provincia' },
        { field: 'createdAt', header: 'Fecha de alta' },
      ],
      ['createdAt', 'code'],
    ),
  },
];
