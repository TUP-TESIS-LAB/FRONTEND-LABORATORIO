import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/empleados';

export const EMPLEADOS_REPORTS: ReportDef[] = [
  {
    id: 'R-EMP-01',
    title: 'Listado de empleados',
    description: 'Listado general de empleados con su sucursal y estado de cuenta.',
    endpoint: `${BASE}/listado`,
    roles: ROLES,
    sortableFields: ['lastName', 'branchName'],
    defaultSort: { field: 'lastName', direction: 'ASC' },
    filters: [
      { key: 'onlyWithoutAccount', label: 'Solo sin cuenta de usuario', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'roleName', header: 'Rol' },
        { field: 'branchName', header: 'Sucursal' },
        { field: 'email', header: 'Email' },
        { field: 'hasAccount', header: 'Tiene cuenta' },
      ],
      ['lastName', 'branchName'],
    ),
  },
  {
    id: 'R-EMP-02',
    title: 'Altas y bajas de empleados',
    description: 'Movimientos de alta y baja de empleados en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-bajas`,
    roles: ROLES,
    sortableFields: ['movementDate'],
    defaultSort: { field: 'movementDate', direction: 'DESC' },
    filters: [
      {
        key: 'movementType', label: 'Tipo de movimiento', type: 'select',
        options: [
          { label: 'Altas', value: 'ALTA' },
          { label: 'Bajas', value: 'BAJA' },
        ],
      },
    ],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'movementType', header: 'Movimiento' },
        { field: 'movementDate', header: 'Fecha' },
        { field: 'branchName', header: 'Sucursal' },
      ],
      ['movementDate'],
    ),
  },
  {
    id: 'R-EMP-03',
    title: 'Higiene de cuentas de empleados',
    description: 'Empleados con cuentas inactivas hace más de N días.',
    endpoint: `${BASE}/higiene-cuentas`,
    roles: ROLES,
    sortableFields: ['daysSinceLastLogin', 'lastName'],
    defaultSort: { field: 'daysSinceLastLogin', direction: 'DESC' },
    filters: [
      { key: 'minDaysInactive', label: 'Días mínimos sin ingresar', type: 'number' },
    ],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'email', header: 'Email' },
        { field: 'daysSinceLastLogin', header: 'Días sin ingresar', align: 'right' },
        { field: 'accountStatus', header: 'Estado de cuenta' },
      ],
      ['daysSinceLastLogin', 'lastName'],
    ),
  },
];
