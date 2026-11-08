import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida que los controles `contrasena` y `confirmarContrasena` de un
 * FormGroup coincidan exactamente.
 */
export const contrasenasCoinciden: ValidatorFn = (
  grupo: AbstractControl,
): ValidationErrors | null => {
  const contrasena = grupo.get('contrasena')?.value as string | undefined;
  const confirmacion = grupo.get('confirmarContrasena')?.value as string | undefined;

  return contrasena === confirmacion ? null : { noCoinciden: true };
};
