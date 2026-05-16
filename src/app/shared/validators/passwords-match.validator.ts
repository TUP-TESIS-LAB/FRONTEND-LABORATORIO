import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Group-level validator: must be attached to a FormGroup containing
// `newPassword` and `confirmPassword`. The error lives on the group
// (`form.errors?.['mismatch']`) so it re-evaluates whenever EITHER
// control changes, not only when `confirmPassword` is touched.
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const newPw = group.get('newPassword')?.value;
  const confirmPw = group.get('confirmPassword')?.value;
  if (newPw == null || confirmPw == null) return null;
  return newPw === confirmPw ? null : { mismatch: true };
};
