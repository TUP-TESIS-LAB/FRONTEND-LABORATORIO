import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const parent = control.parent;
  if (!parent) return null;
  return parent.get('newPassword')?.value === control.value ? null : { mismatch: true };
};
