import { FormControl, FormGroup } from '@angular/forms';
import { timeRangeValid } from './step-horario.component';

describe('step-horario timeRangeValid validator', () => {
  function makeGroup(from: string | null, to: string | null): FormGroup {
    return new FormGroup({
      fromTime: new FormControl(from),
      toTime: new FormControl(to),
    });
  }

  it('marca timeRangeInvalid si fromTime > toTime', () => {
    const result = timeRangeValid(makeGroup('17:00', '09:00'));
    expect(result).toEqual({ timeRangeInvalid: true });
  });

  it('marca timeRangeInvalid si fromTime == toTime', () => {
    const result = timeRangeValid(makeGroup('09:00', '09:00'));
    expect(result).toEqual({ timeRangeInvalid: true });
  });

  it('acepta si fromTime < toTime', () => {
    const result = timeRangeValid(makeGroup('09:00', '17:00'));
    expect(result).toBeNull();
  });

  it('no valida si falta fromTime o toTime (deja que required handle eso)', () => {
    expect(timeRangeValid(makeGroup(null, '17:00'))).toBeNull();
    expect(timeRangeValid(makeGroup('09:00', null))).toBeNull();
  });
});
