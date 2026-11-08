import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

type CampoLogin = 'correo' | 'contrasena';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;

    if (params.get('registrado') === '1') {
      this.exito.set('Tu cuenta fue creada correctamente. Ya puedes iniciar sesión.');
    }

    if (params.get('reset') === '1') {
      this.exito.set('Tu contraseña fue restablecida. Inicia sesión con tu nueva contraseña.');
    }

    const correo = params.get('correo');
    if (correo) {
      this.formulario.controls.correo.setValue(correo);
    }
  }

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.enviando.set(false);
        void this.router.navigateByUrl(this.destino());
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(error, 'No se pudo iniciar sesión.'));
      },
    });
  }

  protected mostrarError(campo: CampoLogin): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  protected mensajeCorreo(): string {
    const control = this.formulario.controls.correo;

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

  protected mensajeContrasena(): string {
    const control = this.formulario.controls.contrasena;

    if (control.hasError('required')) {
      return 'La contraseña es obligatoria.';
    }
    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    return '';
  }

  private destino(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl && returnUrl.startsWith('/')) {
      return returnUrl;
    }

    return this.auth.esSuperadmin() ? '/superadmin' : '/profile';
  }
}
