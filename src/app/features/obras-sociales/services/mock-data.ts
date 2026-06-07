import { InsurerComplete, humanizeInsurerType } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';

export const INSURER_TYPES: InsurerType[] = [
  { name: 'SOCIAL', description: 'Obra Social' },
  { name: 'PRIVATE', description: 'Prepaga' },
  { name: 'SELF_PAY', description: 'Particular' },
];

export const NBU_VERSIONS: NbuVersion[] = [
  { id: 1, versionCode: '2012_2016', publicationYear: 2012, effectivityDate: '2012-01-01' },
  { id: 2, versionCode: '2017_2020', publicationYear: 2017, effectivityDate: '2017-01-01' },
  { id: 3, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' },
];

export const CONTACT_TYPES: ContactType[] = [
  { name: 'PHONE', description: 'Teléfono' },
  { name: 'EMAIL', description: 'Email' },
  { name: 'WHATSAPP', description: 'WhatsApp' },
  { name: 'WEBSITE', description: 'Sitio web' },
];

function t(code: 'SOCIAL' | 'PRIVATE' | 'SELF_PAY') {
  return { insurerType: code, insurerTypeName: humanizeInsurerType(code) };
}

export const MOCK_INSURERS: InsurerComplete[] = [
  {
    id: 1, code: 'OSDE', acronym: 'OSDE', name: 'OSDE', ...t('PRIVATE'),
    description: 'Organización de Servicios Directos Empresarios',
    authorizationUrl: 'https://www.osde.com.ar', active: true,
    specificData: { privateHealth: { cuit: '30-54741764-9', copayPolicy: 'Copago según plan' } },
    plans: [
      {
        id: 11, insurerId: 1, insurerName: 'OSDE', code: '210', acronym: '210', name: 'Plan 210',
        description: 'Plan intermedio', isActive: true, iva: 21,
        actualAgreements: [
          { id: 111, insurerPlanId: 11, insurerPlanName: 'Plan 210', versionNbu: 3, ubValue: 1500, validFromDate: '2024-01-01', validToDate: null },
          { id: 112, insurerPlanId: 11, insurerPlanName: 'Plan 210', versionNbu: 2, ubValue: 1200, validFromDate: '2022-01-01', validToDate: '2023-12-31' },
        ],
      },
      {
        id: 12, insurerId: 1, insurerName: 'OSDE', code: '410', acronym: '410', name: 'Plan 410',
        description: 'Plan superior', isActive: true, iva: 21,
        actualAgreements: [
          { id: 121, insurerPlanId: 12, insurerPlanName: 'Plan 410', versionNbu: 3, ubValue: 2000, validFromDate: '2024-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 1001, insurerId: 1, contactType: 'PHONE', contact: '0810-555-6733', isActive: true },
      { id: 1002, insurerId: 1, contactType: 'WEBSITE', contact: 'https://www.osde.com.ar', isActive: true },
    ],
  },
  {
    id: 2, code: 'SWISS', acronym: 'SMG', name: 'Swiss Medical', ...t('PRIVATE'),
    description: 'Swiss Medical Group', authorizationUrl: 'https://www.swissmedical.com.ar', active: true,
    specificData: { privateHealth: { cuit: '30-61443054-0', copayPolicy: 'Sin copago en plan SMG40' } },
    plans: [
      {
        id: 21, insurerId: 2, insurerName: 'Swiss Medical', code: 'SMG20', acronym: 'SMG20', name: 'SMG 20',
        description: 'Plan base', isActive: true, iva: 21,
        actualAgreements: [
          { id: 211, insurerPlanId: 21, insurerPlanName: 'SMG 20', versionNbu: 3, ubValue: 1400, validFromDate: '2024-03-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 2001, insurerId: 2, contactType: 'PHONE', contact: '0810-444-7793', isActive: true },
      { id: 2002, insurerId: 2, contactType: 'EMAIL', contact: 'atencion@swissmedical.com.ar', isActive: true },
    ],
  },
  {
    id: 3, code: 'IOMA', acronym: 'IOMA', name: 'IOMA', ...t('SOCIAL'),
    description: 'Instituto de Obra Médico Asistencial (Buenos Aires)', authorizationUrl: '', active: true,
    specificData: { socialHealth: { cuit: '30-62739371-9' } },
    plans: [
      {
        id: 31, insurerId: 3, insurerName: 'IOMA', code: 'IOMA-GRAL', acronym: 'GRAL', name: 'General',
        description: 'Cobertura general', isActive: true, iva: 0,
        actualAgreements: [
          { id: 311, insurerPlanId: 31, insurerPlanName: 'General', versionNbu: 2, ubValue: 900, validFromDate: '2023-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 3001, insurerId: 3, contactType: 'PHONE', contact: '0800-222-4662', isActive: true },
    ],
  },
  {
    id: 4, code: 'PAMI', acronym: 'PAMI', name: 'PAMI', ...t('SOCIAL'),
    description: 'Instituto Nacional de Servicios Sociales para Jubilados y Pensionados', authorizationUrl: '', active: true,
    specificData: { socialHealth: { cuit: '30-62258522-5' } },
    plans: [
      {
        id: 41, insurerId: 4, insurerName: 'PAMI', code: 'PAMI-AFIL', acronym: 'AFIL', name: 'Afiliado',
        description: 'Cobertura afiliados', isActive: true, iva: 0,
        actualAgreements: [
          { id: 411, insurerPlanId: 41, insurerPlanName: 'Afiliado', versionNbu: 1, ubValue: 800, validFromDate: '2021-06-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 4001, insurerId: 4, contactType: 'PHONE', contact: '138', isActive: true },
    ],
  },
  {
    id: 5, code: 'PART', acronym: 'PART', name: 'Particular', ...t('SELF_PAY'),
    description: 'Pacientes sin cobertura / pago directo', authorizationUrl: '', active: true,
    specificData: { selfPay: { acceptedPaymentMethods: 'Efectivo, débito, crédito, transferencia' } },
    plans: [
      {
        id: 51, insurerId: 5, insurerName: 'Particular', code: 'PART-STD', acronym: 'STD', name: 'Estándar',
        description: 'Lista de precios particular', isActive: true, iva: 21,
        actualAgreements: [
          { id: 511, insurerPlanId: 51, insurerPlanName: 'Estándar', versionNbu: 3, ubValue: 2500, validFromDate: '2024-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [],
  },
  {
    id: 6, code: 'ASE', acronym: 'ASE', name: 'ASE Nacional', ...t('PRIVATE'),
    description: 'Plan dado de baja (histórico)', authorizationUrl: '', active: false,
    specificData: { privateHealth: { cuit: '30-70812345-6', copayPolicy: 'Discontinuado' } },
    plans: [],
    contacts: [
      { id: 6001, insurerId: 6, contactType: 'EMAIL', contact: 'baja@asenacional.com.ar', isActive: false },
    ],
  },
];
