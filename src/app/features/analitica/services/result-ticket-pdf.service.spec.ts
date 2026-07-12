import { describe, expect, it } from 'vitest';
import { formatHandlingTime } from './result-ticket-pdf.service';

describe('formatHandlingTime', () => {
  it('formatea horas en plural', () => {
    expect(formatHandlingTime(48, 'HOURS')).toBe('48 horas');
  });
  it('formatea horas en singular', () => {
    expect(formatHandlingTime(1, 'HOURS')).toBe('1 hora');
  });
  it('formatea días en plural', () => {
    expect(formatHandlingTime(2, 'DAYS')).toBe('2 días');
  });
  it('formatea días en singular', () => {
    expect(formatHandlingTime(1, 'DAYS')).toBe('1 día');
  });
  it('sin valor → a confirmar', () => {
    expect(formatHandlingTime(null, null)).toBe('a confirmar en el laboratorio');
    expect(formatHandlingTime(5, null)).toBe('a confirmar en el laboratorio');
  });
});
