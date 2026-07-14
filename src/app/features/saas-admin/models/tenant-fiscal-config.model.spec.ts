import { buildFiscalConfigRequest, isoFromDate, dateFromIso, FiscalIdentityFormValue } from './tenant-fiscal-config.model';

/**
 * El contrato de merge del backend es el único lugar donde esta feature puede corromper
 * datos en silencio: si el request omite un campo de identidad, el backend lo interpreta
 * como null y lo BORRA (siempre que al menos otro campo del bloque venga con valor).
 * Por eso estos tests verifican la forma del request, no solo sus valores.
 */
describe('buildFiscalConfigRequest', () => {
  const IDENTITY_KEYS = [
    'razonSocial', 'cuit', 'ingresosBrutos',
    'domicilioComercial', 'condicionIva', 'inicioActividades',
  ] as const;

  const fullForm = (): FiscalIdentityFormValue => ({
    invoicePointOfSale: '0001',
    razonSocial: 'Demo SA',
    cuit: '20-12345678-9',
    ingresosBrutos: '901-1',
    domicilioComercial: 'Calle Falsa 123',
    condicionIva: 'RESPONSABLE_INSCRIPTO',
    inicioActividades: new Date(2020, 0, 1),
  });

  it('manda los 6 campos de identidad aunque estén vacíos, con null explícito', () => {
    const req = buildFiscalConfigRequest(7, {
      ...fullForm(),
      razonSocial: '',
      condicionIva: null,
    });

    for (const key of IDENTITY_KEYS) {
      expect(Object.hasOwn(req, key)).toBe(true);
    }
    expect(req.razonSocial).toBeNull();
    expect(req.condicionIva).toBeNull();
    expect(req.cuit).toBe('20-12345678-9');
    expect(req.ingresosBrutos).toBe('901-1');
    expect(req.domicilioComercial).toBe('Calle Falsa 123');
    expect(req.inicioActividades).toBe('2020-01-01');
  });

  it('con el form entero vacío manda los 6 en null (el backend preserva la identidad guardada)', () => {
    const req = buildFiscalConfigRequest(7, {
      invoicePointOfSale: '',
      razonSocial: '',
      cuit: '',
      ingresosBrutos: '',
      domicilioComercial: '',
      condicionIva: null,
      inicioActividades: null,
    });

    for (const key of IDENTITY_KEYS) {
      expect(Object.hasOwn(req, key)).toBe(true);
      expect(req[key]).toBeNull();
    }
  });

  it('usa el tenantId recibido como targetTenantId y fija provider en NONE', () => {
    const req = buildFiscalConfigRequest(42, fullForm());
    expect(req.targetTenantId).toBe(42);
    expect(req.provider).toBe('NONE');
  });
});

describe('isoFromDate', () => {
  it('serializa en fecha local, no en UTC', () => {
    // Con toISOString() una medianoche local en un timezone de offset positivo se
    // guardaría el día anterior. Se serializa contra los getters locales para evitarlo.
    expect(isoFromDate(new Date(2020, 0, 1))).toBe('2020-01-01');
    expect(isoFromDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('devuelve null para fecha ausente o inválida', () => {
    expect(isoFromDate(null)).toBeNull();
    expect(isoFromDate(new Date('no-es-fecha'))).toBeNull();
  });
});

describe('dateFromIso', () => {
  it('parsea como fecha local, sin correr el día', () => {
    // `new Date('2026-07-10')` es medianoche UTC: en UTC-3 cae el 09/07 a las 21:00 y el
    // datepicker mostraría el día anterior. Bug encontrado en QA manual.
    const d = dateFromIso('2026-07-10')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(10);
  });

  it('hace round-trip con isoFromDate sin perder el día', () => {
    for (const iso of ['2026-07-10', '2020-01-01', '2026-12-31']) {
      expect(isoFromDate(dateFromIso(iso))).toBe(iso);
    }
  });

  it('devuelve null para entrada ausente o basura', () => {
    expect(dateFromIso(null)).toBeNull();
    expect(dateFromIso('')).toBeNull();
    expect(dateFromIso('no-es-fecha')).toBeNull();
  });
});
