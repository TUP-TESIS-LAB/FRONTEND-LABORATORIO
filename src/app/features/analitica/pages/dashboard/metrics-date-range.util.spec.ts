import { defaultMetricDateRange } from './metrics-date-range.util';

describe('defaultMetricDateRange', () => {
  it('devuelve un rango de 30 días (29 de diferencia) terminando hoy, en formato ISO', () => {
    const { dateFrom, dateTo } = defaultMetricDateRange();
    expect(dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    expect(diffDays).toBe(29);
  });

  it('dateTo es la fecha de hoy (horario local)', () => {
    const { dateTo } = defaultMetricDateRange();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    expect(dateTo).toBe(`${y}-${m}-${d}`);
  });
});
