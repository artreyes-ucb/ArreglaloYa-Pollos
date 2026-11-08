import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mensajeDeError } from '../../core/utils/http-error.util';
import { contrasenasCoinciden } from '../../core/validators/contrasenas.validator';

type PasoRecuperacion = 1 | 2;

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly formularioCorreo = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  protected readonly formularioReset = this.fb.nonNullable.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      nuevaContrasena: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
      ],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: contrasenasCoinciden },
  );

  protected readonly paso = signal<PasoRecuperacion>(1);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly correoRecuperacion = signal('');
  protected readonly mensajeServidor = signal('');
  protected readonly codigoDesarrollo = signal('');
  protected readonly reseteoCompletado = signal(false);

  protected solicitarCodigo(): void {
    if (this.formularioCorreo.invalid) {
      this.formularioCorreo.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    const correo = this.formularioCorreo.controls.correo.value;

    this.auth.forgotPassword(correo).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.correoRecuperacion.set(correo);
        this.mensajeServidor.set(respuesta.message);
        this.codigoDesarrollo.set(respuesta.codigo ?? '');
        this.paso.set(2);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(error, 'No se pudo generar el código de recuperación.'));
      },
    });
  }

  protected restablecer(): void {
    if (this.formularioReset.invalid) {
      this.formularioReset.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    const { codigo, nuevaContrasena } = this.formularioReset.getRawValue();

    this.auth
      .resetPassword({
        correo: this.correoRecuperacion(),
        codigo,
        nuevaContrasena,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.reseteoCompletado.set(true);
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.error.set(
            mensajeDeError(error, 'El código es inválido o expiró. Solicita uno nuevo.'),
          );
        },
      });
  }

  protected volverPasoUno(): void {
    this.paso.set(1);
    this.error.set('');
    this.mensajeServidor.set('');
    this.codigoDesarrollo.set('');
    this.formularioReset.reset();
  }

  protected mostrarErrorCorreo(): boolean {
    const control = this.formularioCorreo.controls.correo;
    return control.invalid && (control.dirty || control.touched);
  }

  protected mensajeCorreo(): string {
    const control = this.formularioCorreo.controls.correo;

    if (control.hasError('required')) {
      return 'El correo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }
    if (control.hasError('maxlength')) {
      return 'El correo no puede superar 150 caracteres.';
    }
    return '';
  }

  protected mostrarErrorCodigo(): boolean {
    const control = this.formularioReset.controls.codigo;
    return control.invalid && (control.dirty || control.touched);
  }

  protected mensajeCodigo(): string {
    const control = this.formularioReset.controls.codigo;

    if (control.hasError('required')) {
      return 'El código es obligatorio.';
    }
    if (control.hasError('pattern')) {
      return 'El código debe tener exactamente 6 dígitos.';
    }
    return '';
  }

  protected mostrarErrorNuevaContrasena(): boolean {
    const control = this.formularioReset.controls.nuevaContrasena;
    return control.invalid && (control.dirty || control.touched);
  }

  protected mensajeNuevaContrasena(): string {
    const control = this.formularioReset.controls.nuevaContrasena;

    if (control.hasError('required')) {
      return 'La nueva contraseña es obligatoria.';
    }
    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (control.hasError('maxlength')) {
      return 'La contraseña no puede superar 72 caracteres.';
    }
    return '';
  }

  protected contrasenasNoCoinciden(): boolean {
    const confirmacion = this.formularioReset.controls.confirmarContrasena;
    return (
      this.formularioReset.hasError('noCoinciden') && (confirmacion.touched || confirmacion.dirty)
    );
  }
}
