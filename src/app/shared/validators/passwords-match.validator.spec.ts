import { FormControl, FormGroup, Validators } from '@angular/forms';
import { passwordsMatch } from './passwords-match.validator';

describe('passwordsMatch', () => {
  function buildGroup(newPw: string, confirmPw: string): FormGroup {
    return new FormGroup(
      {
        newPassword: new FormControl(newPw, { nonNullable: true, validators: [Validators.required] }),
        confirmPassword: new FormControl(confirmPw, { nonNullable: true, validators: [Validators.required] }),
      },
      { validators: passwordsMatch },
    );
  }

  it('returns null when passwords match', () => {
    const group = buildGroup('abc12345', 'abc12345');
    expect(group.errors).toBeNull();
  });

  it('returns { mismatch: true } when passwords differ', () => {
    const group = buildGroup('abc12345', 'xyz12345');
    expect(group.errors).toEqual({ mismatch: true });
  });

  // Regression: the previous control-level validator only ran when confirmPassword
  // changed, so changing newPassword AFTER confirmPassword was filled left the
  // group marked valid even though the values diverged. The group-level validator
  // re-runs on every descendant change.
  it('re-evaluates when newPassword changes after confirmPassword was set', () => {
    const group = buildGroup('abc12345', 'abc12345');
    expect(group.errors).toBeNull();
    group.get('newPassword')?.setValue('different');
    expect(group.errors).toEqual({ mismatch: true });
  });

  it('returns null when the group is missing one of the controls', () => {
    const partial = new FormGroup(
      { newPassword: new FormControl('abc12345', { nonNullable: true }) },
      { validators: passwordsMatch },
    );
    expect(partial.errors).toBeNull();
  });
});
