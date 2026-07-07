import { buildMetricParams } from './build-metric-params';

describe('buildMetricParams', () => {
  it('incluye dateFrom, dateTo y granularity, sin branchId cuando no se especifica', () => {
    const params = buildMetricParams({
      dateFrom: '2026-01-01',
      dateTo: '2026-06-30',
      granularity: 'MONTH',
    });

    expect(params.get('dateFrom')).toBe('2026-01-01');
    expect(params.get('dateTo')).toBe('2026-06-30');
    expect(params.get('granularity')).toBe('MONTH');
    expect(params.has('branchId')).toBe(false);
  });

  it('incluye branchId cuando está definido', () => {
    const params = buildMetricParams({
      dateFrom: '2026-01-01',
      dateTo: '2026-06-30',
      granularity: 'DAY',
      branchId: 5,
    });

    expect(params.get('branchId')).toBe('5');
  });
});
