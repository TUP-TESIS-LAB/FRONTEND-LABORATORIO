import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/empleados';

export const EMPLEADOS_REPORTS: ReportDef[] = [
  {
    id: 'R-EMP-01',
    title: 'Listado de empleados',
    description: 'Listado general de empleados con su cuenta de usuario asociada.',
    endpoint: BASE,
    roles: ROLES,
    sortableFields: ['apellido', 'documento'],
    defaultSort: { field: 'apellido', direction: 'ASC' },
    filters: [
      { key: 'estado', label: 'Activo', type: 'boolean' },
      { key: 'rol', label: 'Rol', type: 'text' },
      { key: 'bioquimico', label: 'Es bioquímico', type: 'boolean' },
      { key: 'emailVerificado', label: 'Email verificado', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'apellido', header: 'Apellido' },
        { field: 'nombre', header: 'Nombre' },
        { field: 'documento', header: 'Documento' },
        { field: 'esBioquimico', header: 'Es bioquímico' },
        { field: 'matricula', header: 'Matrícula' },
        { field: 'estado', header: 'Estado' },
        { field: 'rol', header: 'Rol' },
        { field: 'emailVerificado', header: 'Email verificado' },
        { field: 'primerLoginPendiente', header: 'Primer login pendiente' },
        { field: 'ultimoAcceso', header: 'Último acceso' },
      ],
      ['apellido', 'documento'],
    ),
  },
  {
    id: 'R-EMP-02',
    title: 'Altas y bajas de empleados',
    description: 'Movimientos de alta y baja de empleados en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-bajas-por-periodo`,
    roles: ROLES,
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
  },
  {
    id: 'R-EMP-03',
    title: 'Higiene de cuentas de empleados',
    description: 'Empleados con cuentas inactivas hace más de N días u otros problemas de higiene.',
    endpoint: `${BASE}/higiene-cuentas`,
    roles: ROLES,
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
        { field: 'emailVerificado', header: 'Email verificado' },
        { field: 'primerLoginPendiente', header: 'Primer login pendiente' },
        { field: 'ultimoAcceso', header: 'Último acceso' },
        { field: 'diasSinAcceso', header: 'Días sin acceso', align: 'right' },
      ],
      ['apellido', 'diasSinAcceso'],
    ),
  },
];
