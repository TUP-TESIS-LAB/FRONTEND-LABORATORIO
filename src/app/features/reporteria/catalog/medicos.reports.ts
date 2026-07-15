import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR'];
const BASE = '/api/v1/sucursales/reportes/medicos';

export const MEDICOS_REPORTS: ReportDef[] = [
  {
    id: 'R-MED-01',
    title: 'Listado de médicos derivantes',
    description: 'Listado general de médicos derivantes con matrícula y especialidad.',
    endpoint: BASE,
    roles: ROLES,
    sortableFields: ['apellido', 'matricula', 'especialidad'],
    defaultSort: { field: 'apellido', direction: 'ASC' },
    filters: [
      { key: 'estado', label: 'Activo', type: 'boolean' },
      { key: 'especialidad', label: 'Especialidad', type: 'text' },
      {
        key: 'tipoMatricula', label: 'Tipo de matrícula', type: 'select',
        options: [
          { label: 'Nacional', value: 'NACIONAL' },
          { label: 'Provincial', value: 'PROVINCIAL' },
        ],
      },
      { key: 'institucion', label: 'Institución', type: 'text' },
    ],
    columns: withSortableColumns(
      [
        { field: 'apellido', header: 'Apellido' },
        { field: 'nombre', header: 'Nombre' },
        { field: 'matricula', header: 'Matrícula' },
        { field: 'tipoMatricula', header: 'Tipo de matrícula' },
        { field: 'especialidad', header: 'Especialidad' },
        { field: 'institucion', header: 'Institución' },
        { field: 'email', header: 'Email' },
        { field: 'telefono', header: 'Teléfono' },
        { field: 'estado', header: 'Estado' },
      ],
      ['apellido', 'matricula', 'especialidad'],
    ),
  },
  {
    id: 'R-MED-02',
    title: 'Altas de médicos por período',
    description: 'Médicos derivantes dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-por-periodo`,
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
        { field: 'cantidadAltas', header: 'Cantidad de altas', align: 'right' },
      ],
      ['periodo'],
    ),
  },
  {
    id: 'R-MED-03',
    title: 'Médicos por especialidad',
    description: 'Cantidad de médicos derivantes agrupados por especialidad.',
    endpoint: `${BASE}/por-especialidad`,
    roles: ROLES,
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
