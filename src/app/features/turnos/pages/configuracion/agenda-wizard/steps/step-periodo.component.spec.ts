import { FormControl, FormGroup } from '@angular/forms';
import { dateRangeValid } from './step-periodo.component';

describe('step-periodo dateRangeValid validator', () => {
  function makeGroup(from: Date | null, to: Date | null): FormGroup {
    return new FormGroup({
      validFrom: new FormControl(from),
      validTo: new FormControl(to),
    });
  }

  it('marca dateRangeInvalid si validFrom >= validTo', () => {
    const result = dateRangeValid(makeGroup(new Date('2026-06-15'), new Date('2026-06-15')));
    expect(result).toEqual({ dateRangeInvalid: true });
  });

  it('marca dateRangeInvalid si validFrom > validTo', () => {
    const result = dateRangeValid(makeGroup(new Date('2026-06-20'), new Date('2026-06-15')));
    expect(result).toEqual({ dateRangeInvalid: true });
  });

  it('acepta el form si validFrom < validTo', () => {
    const result = dateRangeValid(makeGroup(new Date('2026-06-01'), new Date('2026-06-30')));
    expect(result).toBeNull();
  });

  it('no valida si falta validFrom o validTo (deja que required handle eso)', () => {
    expect(dateRangeValid(makeGroup(null, new Date()))).toBeNull();
    expect(dateRangeValid(makeGroup(new Date(), null))).toBeNull();
  });
});
