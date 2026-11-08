import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mensajeDeError } from '../../core/utils/http-error.util';
import { contrasenasCoinciden } from '../../core/validators/contrasenas.validator';

type CampoRegistro =
  'nombres' | 'apellidos' | 'correo' | 'telefono' | 'contrasena' | 'confirmarContrasena';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,30}$/)]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmarContrasena: ['', [Validators.required]],
      registrarseComoTrabajador: [false],
    },
    { validators: contrasenasCoinciden },
  );

  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    const valores = this.formulario.getRawValue();

    this.auth
      .register({
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        correo: valores.correo,
        telefono: valores.telefono,
        contrasena: valores.contrasena,
        registrarseComoTrabajador: valores.registrarseComoTrabajador,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          void this.router.navigate(['/login'], {
            queryParams: {
              registrado: '1',
              correo: valores.correo,
            },
          });
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.error.set(
            mensajeDeError(error, 'No se pudo crear la cuenta. Inténtalo nuevamente.'),
          );
        },
      });
  }

  protected mensaje(campo: CampoRegistro): string {
    const control = this.formulario.controls[campo];

    if (!control || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return campo === 'confirmarContrasena'
        ? 'Confirma tu contraseña.'
        : 'Este campo es obligatorio.';
    }

    if (campo === 'correo' && control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (campo === 'correo' && control.hasError('maxlength')) {
      return 'El correo no puede superar 150 caracteres.';
    }

    if (campo === 'telefono' && control.hasError('pattern')) {
      return 'Usa entre 7 y 30 dígitos o caracteres válidos (+, -, espacios, paréntesis).';
    }

    if (campo === 'contrasena' && control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (campo === 'contrasena' && control.hasError('maxlength')) {
      return 'La contraseña no puede superar 72 caracteres.';
    }

    if ((campo === 'nombres' || campo === 'apellidos') && control.hasError('maxlength')) {
      return 'No puede superar 100 caracteres.';
    }

    return '';
  }

  protected contrasenasNoCoinciden(): boolean {
    const confirmacion = this.formulario.controls.confirmarContrasena;
    return this.formulario.hasError('noCoinciden') && (confirmacion.touched || confirmacion.dirty);
  }
}
