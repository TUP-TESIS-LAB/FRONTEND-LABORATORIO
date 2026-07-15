import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];
const BASE = '/api/v1/analitica/reportes/pacientes';

export const PACIENTES_REPORTS: ReportDef[] = [
  {
    id: 'R-PAC-01',
    title: 'Listado de pacientes',
    description: 'Listado general de pacientes con sus datos de contacto y cobertura.',
    endpoint: `${BASE}/listado`,
    roles: ROLES,
    sortableFields: ['lastName', 'firstName', 'birthDate', 'createdAt'],
    defaultSort: { field: 'lastName', direction: 'ASC' },
    filters: [
      // Valores de 'sex' a confirmar con el backend (M/F/OTRO vs MASCULINO/FEMENINO/OTRO).
      {
        key: 'sex', label: 'Sexo', type: 'select',
        options: [
          { label: 'Masculino', value: 'M' },
          { label: 'Femenino', value: 'F' },
          { label: 'Otro', value: 'OTRO' },
        ],
      },
    ],
    columns: withSortableColumns(
      [
        { field: 'dni', header: 'DNI' },
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'birthDate', header: 'Nacimiento' },
        { field: 'sex', header: 'Sexo' },
        { field: 'phone', header: 'Teléfono' },
        { field: 'email', header: 'Email' },
        { field: 'coverageName', header: 'Cobertura' },
      ],
      ['lastName', 'firstName', 'birthDate', 'createdAt'],
    ),
  },
  {
    id: 'R-PAC-02',
    title: 'Altas de pacientes por período',
    description: 'Pacientes dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas`,
    roles: ROLES,
    sortableFields: ['createdAt', 'lastName'],
    defaultSort: { field: 'createdAt', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'dni', header: 'DNI' },
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'createdAt', header: 'Fecha de alta' },
        { field: 'branchName', header: 'Sucursal' },
      ],
      ['createdAt', 'lastName'],
    ),
  },
  {
    id: 'R-PAC-03',
    title: 'Demografía de pacientes',
    description: 'Distribución de pacientes por rango etario y sexo.',
    endpoint: `${BASE}/demografia`,
    roles: ROLES,
    sortableFields: ['ageRange', 'sex', 'count'],
    defaultSort: { field: 'ageRange', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'ageRange', header: 'Rango etario' },
        { field: 'sex', header: 'Sexo' },
        { field: 'count', header: 'Cantidad', align: 'right' },
      ],
      ['ageRange', 'sex', 'count'],
    ),
  },
  {
    id: 'R-PAC-04',
    title: 'Pacientes por cobertura',
    description: 'Cantidad de pacientes agrupados por obra social/cobertura.',
    endpoint: `${BASE}/por-cobertura`,
    roles: ROLES,
    sortableFields: ['coverageName', 'patientCount'],
    defaultSort: { field: 'patientCount', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'coverageName', header: 'Cobertura' },
        { field: 'patientCount', header: 'Pacientes', align: 'right' },
      ],
      ['coverageName', 'patientCount'],
    ),
  },
  {
    id: 'R-PAC-05',
    title: 'Pacientes con datos incompletos',
    description: 'Pacientes a los que les falta algún dato de contacto obligatorio.',
    endpoint: `${BASE}/datos-incompletos`,
    roles: ROLES,
    sortableFields: ['lastName', 'createdAt'],
    defaultSort: { field: 'lastName', direction: 'ASC' },
    filters: [
      { key: 'onlyMissingEmail', label: 'Solo sin email', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'dni', header: 'DNI' },
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'missingFieldsCount', header: 'Datos faltantes', align: 'right' },
      ],
      ['lastName', 'createdAt'],
    ),
  },
];
