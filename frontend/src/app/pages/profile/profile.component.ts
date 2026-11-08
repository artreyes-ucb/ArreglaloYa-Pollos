import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol, RolAlternable, Usuario } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

type CampoPerfil = 'nombres' | 'apellidos' | 'telefono';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,30}$/)]],
  });

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly cambiandoRol = signal(false);
  protected readonly habilitandoRol = signal(false);
  protected readonly exito = signal('');
  protected readonly error = signal('');
  protected readonly exitoRol = signal('');
  protected readonly errorRol = signal('');

  protected readonly usuario = this.auth.usuario;

  protected readonly iniciales = computed(() => {
    const usuario = this.auth.usuario();
    if (!usuario) {
      return '?';
    }
    return `${usuario.nombres.charAt(0)}${usuario.apellidos.charAt(0)}`.toUpperCase();
  });

  protected readonly tieneTrabajador = computed(
    () => this.auth.usuario()?.roles.includes('TRABAJADOR') ?? false,
  );

  protected readonly tieneCliente = computed(
    () => this.auth.usuario()?.roles.includes('CLIENTE') ?? false,
  );

  protected readonly esCuentaAdministrativa = this.auth.esCuentaAdministrativa;

  protected readonly esRolAdministrativo = computed(() => {
    const rol = this.auth.usuario()?.rolActivo;
    return rol === 'ADMIN' || rol === 'SUPERADMIN';
  });

  protected readonly puedeAlternarRol = computed(
    () => !this.esCuentaAdministrativa() && this.tieneCliente() && this.tieneTrabajador(),
  );

  protected readonly puedeHabilitarTrabajador = computed(
    () => !this.esCuentaAdministrativa() && !this.tieneTrabajador(),
  );

  ngOnInit(): void {
    this.cargarPerfil();
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.exito.set('');
    this.error.set('');

    this.auth.updateProfile(this.formulario.getRawValue()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set('Tus datos personales se actualizaron correctamente.');
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(error, 'No se pudieron actualizar tus datos.'));
      },
    });
  }

  protected cambiarRol(rol: RolAlternable): void {
    if (this.cambiandoRol() || this.auth.usuario()?.rolActivo === rol) {
      return;
    }

    this.cambiandoRol.set(true);
    this.exitoRol.set('');
    this.errorRol.set('');

    this.auth.switchRole(rol).subscribe({
      next: (respuesta) => {
        this.cambiandoRol.set(false);
        this.exitoRol.set(`Ahora estás usando el rol ${respuesta.usuario.rolActivo}.`);
      },
      error: (error: unknown) => {
        this.cambiandoRol.set(false);
        this.errorRol.set(mensajeDeError(error, 'No se pudo cambiar de rol.'));
      },
    });
  }

  protected habilitarRolTrabajador(): void {
    if (this.habilitandoRol()) {
      return;
    }

    this.habilitandoRol.set(true);
    this.exitoRol.set('');
    this.errorRol.set('');

    this.auth.enableWorkerRole().subscribe({
      next: () => {
        this.habilitandoRol.set(false);
        this.exitoRol.set(
          'Rol de Trabajador habilitado. Ya puedes alternar entre Cliente y Trabajador cuando quieras.',
        );
      },
      error: (error: unknown) => {
        this.habilitandoRol.set(false);
        this.errorRol.set(mensajeDeError(error, 'No se pudo habilitar el rol de Trabajador.'));
      },
    });
  }

  protected mostrarError(campo: CampoPerfil): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  protected mensaje(campo: CampoPerfil): string {
    const control = this.formulario.controls[campo];

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo === 'telefono' && control.hasError('pattern')) {
      return 'Usa entre 7 y 30 dígitos o caracteres válidos (+, -, espacios, paréntesis).';
    }

    if ((campo === 'nombres' || campo === 'apellidos') && control.hasError('maxlength')) {
      return 'No puede superar 100 caracteres.';
    }

    return '';
  }

  protected etiquetaRolActivo(): string {
    switch (this.auth.usuario()?.rolActivo) {
      case 'TRABAJADOR':
        return 'Ofreces servicios';
      case 'ADMIN':
        return 'Administras la plataforma';
      case 'SUPERADMIN':
        return 'Control total del sistema';
      default:
        return 'Solicitas servicios';
    }
  }

  protected descripcionRolActivo(): string {
    switch (this.auth.usuario()?.rolActivo) {
      case 'TRABAJADOR':
        return 'Estás usando tu cuenta como trabajador independiente. Puedes volver al modo cliente cuando lo necesites.';
      case 'ADMIN':
        return 'Tu cuenta tiene privilegios administrativos. Los permisos se derivan de este rol activo y se validan en el servidor.';
      case 'SUPERADMIN':
        return 'Tu cuenta tiene control total del sistema. Desde el panel de superadministración puedes gestionar administradores y revisar la auditoría.';
      default:
        return 'Estás usando tu cuenta como cliente. Si ofreces servicios, activa el rol de trabajador sin crear otra cuenta.';
    }
  }

  protected claseRol(rol: Rol | undefined): string {
    return `badge badge--${(rol ?? 'CLIENTE').toLowerCase()}`;
  }

  protected claseChip(rol: Rol): string {
    return `chip chip--${rol.toLowerCase()}`;
  }

  protected claseEstado(): string {
    return `badge badge--${(this.auth.usuario()?.estado ?? 'ACTIVO').toLowerCase()}`;
  }

  private cargarPerfil(): void {
    const actual = this.auth.usuario();
    if (actual) {
      this.rellenarFormulario(actual);
    }

    this.auth.getMe().subscribe({
      next: (usuario) => {
        this.rellenarFormulario(usuario);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(error, 'No se pudo cargar tu perfil.'));
      },
    });
  }

  private rellenarFormulario(usuario: Usuario): void {
    this.formulario.setValue({
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
    });
  }
}
