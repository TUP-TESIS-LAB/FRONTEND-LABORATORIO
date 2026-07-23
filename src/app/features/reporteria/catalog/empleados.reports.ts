import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/empleados';

export const EMPLEADOS_REPORTS: ReportDef[] = [
  {
    id: 'R-EMP-02',
    // D2.2: REP-KIT-06 pedía branchId acá, pero es irrealizable — UserBranchAccessPort
    // resuelve user→branches, no branch→users, y la vía inversa cruzaría JPA entre
    // módulos (prohibido). branchFilterable queda ausente/false a propósito.
    title: 'Altas y bajas de empleados',
    description: 'Movimientos de alta y baja de empleados en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-bajas-por-periodo`,
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
        { field: 'altas', header: 'Altas', align: 'right' },
        { field: 'bajas', header: 'Bajas', align: 'right' },
      ],
      ['periodo'],
    ),
    // Serie temporal (D3/D4). Dos métricas por fila (altas Y bajas) → dos columnas.
    variation: [
      { field: 'variacionAltas', header: 'Var. altas' },
      { field: 'variacionBajas', header: 'Var. bajas' },
    ],
  },
  {
    id: 'R-EMP-03',
    // D2.2: mismo motivo que R-EMP-02 — branchFilterable ausente/false a propósito.
    title: 'Higiene de cuentas de empleados',
    description: 'Empleados con cuentas inactivas hace más de N días u otros problemas de higiene.',
    endpoint: `${BASE}/higiene-cuentas`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['apellido', 'diasSinAcceso'],
    defaultSort: { field: 'diasSinAcceso', direction: 'DESC' },
    filters: [
      { key: 'sinAccesoDesdeDias', label: 'Días mínimos sin acceso', type: 'number' },
      { key: 'primerLoginPendiente', label: 'Primer login pendiente', type: 'boolean' },
      { key: 'emailNoVerificado', label: 'Email no verificado', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'apellido', header: 'Apellido' },
        { field: 'nombre', header: 'Nombre' },
        { field: 'rol', header: 'Rol' },
        { field: 'emailVerificado', header: 'Email verificado', type: 'boolean' },
        { field: 'primerLoginPendiente', header: 'Primer login pendiente', type: 'boolean' },
        { field: 'ultimoAcceso', header: 'Último acceso', type: 'date' },
        { field: 'diasSinAcceso', header: 'Días sin acceso', align: 'right' },
      ],
      ['apellido', 'diasSinAcceso'],
    ),
  },
];
