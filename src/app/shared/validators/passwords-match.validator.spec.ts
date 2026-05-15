import { FormControl, FormGroup, Validators } from '@angular/forms';
import { passwordsMatch } from './passwords-match.validator';

describe('passwordsMatch', () => {
  function buildGroup(newPw: string, confirmPw: string): FormGroup {
    return new FormGroup({
      newPassword: new FormControl(newPw, { nonNullable: true, validators: [Validators.required] }),
      confirmPassword: new FormControl(confirmPw, { nonNullable: true, validators: [Validators.required, passwordsMatch] }),
    });
  }

  it('returns null when passwords match', () => {
    const group = buildGroup('abc12345', 'abc12345');
    expect(group.get('confirmPassword')?.errors).toBeNull();
  });

  it('returns { mismatch: true } when passwords differ', () => {
    const group = buildGroup('abc12345', 'xyz12345');
    group.get('confirmPassword')?.updateValueAndValidity();
    expect(group.get('confirmPassword')?.errors).toEqual({ mismatch: true });
  });

  it('returns null when control has no parent yet', () => {
    const orphan = new FormControl('anything', { nonNullable: true, validators: [passwordsMatch] });
    expect(passwordsMatch(orphan)).toBeNull();
  });
});
