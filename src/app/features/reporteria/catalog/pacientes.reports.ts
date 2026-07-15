import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];
const BASE = '/api/v1/analitica/reportes/pacientes';

export const PACIENTES_REPORTS: ReportDef[] = [
  {
    id: 'R-PAC-01',
    title: 'Listado de pacientes',
    description: 'Listado general de pacientes con sus datos de contacto y cobertura.',
    endpoint: BASE,
    roles: ROLES,
    sortableFields: ['dni', 'apellido', 'fechaNacimiento', 'fechaAlta'],
    defaultSort: { field: 'apellido', direction: 'ASC' },
    filters: [
      {
        key: 'sexo', label: 'Sexo', type: 'select',
        options: [
          { label: 'Masculino', value: 'MALE' },
          { label: 'Femenino', value: 'FEMALE' },
          { label: 'Otro', value: 'OTHER' },
        ],
      },
      {
        key: 'grupoEtario', label: 'Grupo etario', type: 'select',
        options: [
          { label: '0-9', value: '0-9' },
          { label: '10-19', value: '10-19' },
          { label: '20-29', value: '20-29' },
          { label: '30-39', value: '30-39' },
          { label: '40-49', value: '40-49' },
          { label: '50-59', value: '50-59' },
          { label: '60-69', value: '60-69' },
          { label: '70+', value: '70+' },
        ],
      },
      {
        key: 'cobertura', label: 'Cobertura', type: 'select',
        options: [
          { label: 'Con cobertura', value: 'con-cobertura' },
          { label: 'Sin cobertura', value: 'sin-cobertura' },
        ],
      },
      {
        key: 'estado', label: 'Estado', type: 'select',
        options: [
          { label: 'Datos mínimos', value: 'MIN' },
          { label: 'Datos completos', value: 'COMPLETE' },
          { label: 'Verificado', value: 'VERIFIED' },
        ],
      },
      {
        key: 'origen', label: 'Origen', type: 'select',
        options: [
          { label: 'Personal', value: 'STAFF' },
          { label: 'Portal', value: 'PORTAL' },
        ],
      },
      { key: 'datosIncompletos', label: 'Datos incompletos', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'dni', header: 'DNI' },
        { field: 'apellido', header: 'Apellido' },
        { field: 'nombre', header: 'Nombre' },
        { field: 'fechaNacimiento', header: 'Nacimiento' },
        { field: 'sexo', header: 'Sexo' },
        { field: 'sexoAlNacer', header: 'Sexo al nacer' },
        { field: 'estado', header: 'Estado' },
        { field: 'origen', header: 'Origen' },
        { field: 'fechaAlta', header: 'Fecha de alta' },
      ],
      ['dni', 'apellido', 'fechaNacimiento', 'fechaAlta'],
    ),
  },
  {
    id: 'R-PAC-02',
    title: 'Altas de pacientes por período',
    description: 'Pacientes dados de alta en el rango de fechas elegido.',
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
  },
  {
    id: 'R-PAC-03',
    title: 'Demografía de pacientes',
    description: 'Distribución de pacientes por rango etario y sexo.',
    endpoint: `${BASE}/demografia`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['grupoEtario', 'sexo', 'cantidad'],
    defaultSort: { field: 'grupoEtario', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'grupoEtario', header: 'Grupo etario' },
        { field: 'sexo', header: 'Sexo' },
        { field: 'cantidad', header: 'Cantidad', align: 'right' },
      ],
      ['grupoEtario', 'sexo', 'cantidad'],
    ),
  },
  {
    id: 'R-PAC-04',
    title: 'Pacientes por cobertura',
    description: 'Cantidad de pacientes agrupados por obra social/cobertura.',
    endpoint: `${BASE}/por-cobertura`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['cobertura', 'cantidadPacientes'],
    defaultSort: { field: 'cantidadPacientes', direction: 'DESC' },
    filters: [
      {
        key: 'tipoCobertura', label: 'Tipo de cobertura', type: 'select',
        options: [
          { label: 'Con cobertura', value: 'con-cobertura' },
          { label: 'Sin cobertura', value: 'sin-cobertura' },
        ],
      },
      { key: 'plan', label: 'Plan (ID)', type: 'number' },
    ],
    columns: withSortableColumns(
      [
        { field: 'cobertura', header: 'Cobertura' },
        { field: 'cantidadPacientes', header: 'Pacientes', align: 'right' },
      ],
      ['cobertura', 'cantidadPacientes'],
    ),
  },
  {
    id: 'R-PAC-05',
    title: 'Pacientes con datos incompletos',
    description: 'Ranking de campos omitidos entre pacientes con datos incompletos.',
    endpoint: `${BASE}/datos-incompletos`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['campo', 'cantidadPacientes'],
    defaultSort: { field: 'cantidadPacientes', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'campo', header: 'Campo' },
        { field: 'cantidadPacientes', header: 'Pacientes', align: 'right' },
        { field: 'porcentaje', header: 'Porcentaje', align: 'right' },
      ],
      ['campo', 'cantidadPacientes'],
    ),
  },
];
