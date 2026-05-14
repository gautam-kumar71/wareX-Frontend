import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!*]).+$/;
export const PASSWORD_HINT =
  'Use 8-72 characters with uppercase, lowercase, a number, and a special character.';

export function passwordStrengthValidators() {
  return [
    Validators.required,
    Validators.minLength(8),
    Validators.maxLength(72),
    Validators.pattern(PASSWORD_PATTERN)
  ];
}

export function passwordLengthValidators() {
  return [
    Validators.required,
    Validators.minLength(8),
    Validators.maxLength(72)
  ];
}

export function passwordsMatchValidator(passwordField: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordField)?.value;
    const confirmPassword = group.get(confirmField)?.value;
    return password === confirmPassword ? null : { mismatch: true };
  };
}
