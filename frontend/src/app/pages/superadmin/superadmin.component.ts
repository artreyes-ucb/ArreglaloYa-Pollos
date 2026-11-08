import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EstadoAdministrable,
  RegistroAuditoria,
  Rol,
  Usuario,
} from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SuperadminService } from '../../core/services/superadmin.service';
import { mensajeDeError } from '../../core/utils/http-error.util';
import { contrasenasCoinciden } from '../../core/validators/contrasenas.validator';

type CampoCrearAdmin =
  'nombres' | 'apellidos' | 'correo' | 'telefono' | 'contrasena' | 'confirmarContrasena';

type CampoEditarAdmin = 'nombres' | 'apellidos' | 'correo' | 'telefono';

const INTERVALO_ACTUALIZACION_MS = 15_000;

@Component({
  selector: 'app-superadmin',
  imports: [ReactiveFormsModule],
  templateUrl: './superadmin.component.html',
  styleUrl: './superadmin.component.css',
})
export class SuperadminComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly superadminService = inject(SuperadminService);
  protected readonly auth = inject(AuthService);

  protected readonly rolesDisponibles: Rol[] = ['CLIENTE', 'TRABAJADOR', 'ADMIN', 'SUPERADMIN'];

  private intervaloActualizacion?: ReturnType<typeof setInterval>;

  protected readonly admins = signal<Usuario[]>([]);
  protected readonly auditoria = signal<RegistroAuditoria[]>([]);
  protected readonly cargandoAdmins = signal(true);
  protected readonly cargandoAuditoria = signal(true);
  protected readonly errorAdmins = signal('');
  protected readonly errorAuditoria = signal('');
  protected readonly exito = signal('');
  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly filtroTexto = signal('');
  protected readonly filtroAccion = signal('TODAS');

  protected readonly modalCrearAbierto = signal(false);
  protected readonly modalEditarAbierto = signal(false);
  protected readonly adminSeleccionado = signal<Usuario | null>(null);
  protected readonly creando = signal(false);
  protected readonly guardandoAdmin = signal(false);
  protected readonly errorCrear = signal('');
  protected readonly errorEditar = signal('');
  protected readonly confirmandoEstadoId = signal<string | null>(null);
  protected readonly cambiandoEstadoId = signal<string | null>(null);

  private readonly formateadorFecha = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/La_Paz',
  });

  private readonly formateadorHora = new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/La_Paz',
  });

  protected readonly formCrear = this.fb.nonNullable.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,30}$/)]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: contrasenasCoinciden },
  );

  protected readonly formEditar = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,30}$/)]],
    roles: this.fb.nonNullable.group({
      CLIENTE: false,
      TRABAJADOR: false,
      ADMIN: false,
      SUPERADMIN: false,
    }),
  });

  protected readonly totalAdmins = computed(() => this.admins().length);

  protected readonly adminsActivos = computed(
    () => this.admins().filter((admin) => admin.estado === 'ACTIVO').length,
  );

  protected readonly adminsInactivos = computed(
    () => this.admins().filter((admin) => admin.estado === 'INACTIVO').length,
  );

  protected readonly eventosUltimas24h = computed(() => {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return this.auditoria().filter((registro) => new Date(registro.fechaEvento).getTime() >= limite)
      .length;
  });

  protected readonly accionesDisponibles = computed(() =>
    Array.from(new Set(this.auditoria().map((registro) => registro.accion))).sort(),
  );

  protected readonly auditoriaFiltrada = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const accion = this.filtroAccion();

    return this.auditoria().filter((registro) => {
      if (accion !== 'TODAS' && registro.accion !== accion) {
        return false;
      }

      if (texto.length === 0) {
        return true;
      }

      const actor = registro.actor
        ? `${registro.actor.nombres} ${registro.actor.apellidos} ${registro.actor.correo}`
        : 'sistema';

      return `${registro.accion} ${registro.entidadAfectada} ${
        registro.idEntidadAfectada ?? ''
      } ${actor}`
        .toLowerCase()
        .includes(texto);
    });
  });

  protected readonly horaActualizacion = computed(() => {
    const fecha = this.ultimaActualizacion();
    return fecha ? this.formateadorHora.format(fecha) : '—';
  });

  ngOnInit(): void {
    this.cargarAdmins();
    this.cargarAuditoria();

    this.intervaloActualizacion = setInterval(() => {
      if (!document.hidden) {
        this.cargarAdmins(true);
        this.cargarAuditoria(true);
      }
    }, INTERVALO_ACTUALIZACION_MS);
  }

  ngOnDestroy(): void {
    if (this.intervaloActualizacion) {
      clearInterval(this.intervaloActualizacion);
    }
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    if (this.modalCrearAbierto()) {
      this.cerrarModalCrear();
    }
    if (this.modalEditarAbierto()) {
      this.cerrarModalEditar();
    }
  }

  protected cargarAdmins(silencioso = false): void {
    if (!silencioso) {
      this.cargandoAdmins.set(true);
    }

    this.superadminService.listarAdmins().subscribe({
      next: (admins) => {
        this.admins.set(admins);
        this.cargandoAdmins.set(false);
        this.errorAdmins.set('');
      },
      error: (error: unknown) => {
        this.cargandoAdmins.set(false);
        if (!silencioso) {
          this.errorAdmins.set(
            mensajeDeError(error, 'No se pudieron cargar las cuentas de administrador.'),
          );
        }
      },
    });
  }

  protected cargarAuditoria(silencioso = false): void {
    if (!silencioso) {
      this.cargandoAuditoria.set(true);
    }

    this.superadminService.listarAuditoria().subscribe({
      next: (registros) => {
        this.auditoria.set(registros);
        this.cargandoAuditoria.set(false);
        this.ultimaActualizacion.set(new Date());
        this.errorAuditoria.set('');
      },
      error: (error: unknown) => {
        this.cargandoAuditoria.set(false);
        if (!silencioso) {
          this.errorAuditoria.set(
            mensajeDeError(error, 'No se pudo cargar el historial de auditoría.'),
          );
        }
      },
    });
  }

  protected actualizarTodo(): void {
    this.exito.set('');
    this.cargarAdmins();
    this.cargarAuditoria();
  }

  protected abrirModalCrear(): void {
    this.formCrear.reset();
    this.errorCrear.set('');
    this.modalCrearAbierto.set(true);
  }

  protected cerrarModalCrear(): void {
    if (this.creando()) {
      return;
    }
    this.modalCrearAbierto.set(false);
  }

  protected crearAdmin(): void {
    if (this.formCrear.invalid) {
      this.formCrear.markAllAsTouched();
      return;
    }

    this.creando.set(true);
    this.errorCrear.set('');
    this.exito.set('');

    const { nombres, apellidos, correo, telefono, contrasena } = this.formCrear.getRawValue();

    this.superadminService
      .crearAdmin({ nombres, apellidos, correo, telefono, contrasena })
      .subscribe({
        next: (admin) => {
          this.creando.set(false);
          this.modalCrearAbierto.set(false);
          this.exito.set(
            `La cuenta de administrador de ${admin.nombres} ${admin.apellidos} fue creada correctamente.`,
          );
          this.cargarAdmins(true);
          this.cargarAuditoria(true);
        },
        error: (error: unknown) => {
          this.creando.set(false);
          this.errorCrear.set(
            mensajeDeError(error, 'No se pudo crear la cuenta de administrador.'),
          );
        },
      });
  }

  protected abrirModalEditar(admin: Usuario): void {
    this.adminSeleccionado.set(admin);
    this.errorEditar.set('');
    this.formEditar.setValue({
      nombres: admin.nombres,
      apellidos: admin.apellidos,
      correo: admin.correo,
      telefono: admin.telefono,
      roles: {
        CLIENTE: admin.roles.includes('CLIENTE'),
        TRABAJADOR: admin.roles.includes('TRABAJADOR'),
        ADMIN: admin.roles.includes('ADMIN'),
        SUPERADMIN: admin.roles.includes('SUPERADMIN'),
      },
    });

    const controlSuperadmin = this.formEditar.controls.roles.controls.SUPERADMIN;
    if (this.esPropio(admin)) {
      controlSuperadmin.disable();
    } else {
      controlSuperadmin.enable();
    }

    this.modalEditarAbierto.set(true);
  }

  protected cerrarModalEditar(): void {
    if (this.guardandoAdmin()) {
      return;
    }
    this.formEditar.controls.roles.controls.SUPERADMIN.enable();
    this.modalEditarAbierto.set(false);
    this.adminSeleccionado.set(null);
  }

  protected guardarAdmin(): void {
    const admin = this.adminSeleccionado();

    if (!admin) {
      return;
    }

    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }

    const roles = this.rolesSeleccionados();

    if (roles.length === 0) {
      this.errorEditar.set('Debe asignar al menos un rol a la cuenta.');
      return;
    }

    if (this.esPropio(admin) && !roles.includes('SUPERADMIN')) {
      this.errorEditar.set('No puedes quitarte tu propio rol de SUPERADMIN.');
      return;
    }

    const { nombres, apellidos, correo, telefono } = this.formEditar.getRawValue();

    this.guardandoAdmin.set(true);
    this.errorEditar.set('');
    this.exito.set('');

    this.superadminService
      .actualizarAdmin(admin.id, {
        nombres,
        apellidos,
        correo,
        telefono,
        roles,
      })
      .subscribe({
        next: (actualizado) => {
          this.guardandoAdmin.set(false);
          this.formEditar.controls.roles.controls.SUPERADMIN.enable();
          this.modalEditarAbierto.set(false);
          this.adminSeleccionado.set(null);
          this.exito.set(
            `La cuenta de ${actualizado.nombres} ${actualizado.apellidos} fue actualizada correctamente.`,
          );
          this.cargarAdmins(true);
          this.cargarAuditoria(true);
        },
        error: (error: unknown) => {
          this.guardandoAdmin.set(false);
          this.errorEditar.set(
            mensajeDeError(error, 'No se pudo actualizar la cuenta de administrador.'),
          );
        },
      });
  }

  protected solicitarCambioEstado(admin: Usuario): void {
    this.confirmandoEstadoId.set(admin.id);
  }

  protected cancelarCambioEstado(): void {
    this.confirmandoEstadoId.set(null);
  }

  protected confirmarCambioEstado(admin: Usuario): void {
    this.confirmandoEstadoId.set(null);
    this.cambiarEstado(admin);
  }

  protected esPropio(admin: Usuario | null): boolean {
    return admin !== null && admin.id === this.auth.usuario()?.id;
  }

  protected esActivo(admin: Usuario): boolean {
    return admin.estado === 'ACTIVO';
  }

  protected claseRol(rol: Rol | undefined): string {
    return `badge badge--${(rol ?? 'CLIENTE').toLowerCase()}`;
  }

  protected claseChip(rol: Rol): string {
    return `chip chip--${rol.toLowerCase()}`;
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }

  protected claseAccion(accion: string): string {
    if (accion.startsWith('CREAR')) {
      return 'badge badge--activo';
    }
    if (accion.startsWith('ACTUALIZAR')) {
      return 'badge badge--admin';
    }
    if (accion.startsWith('CAMBIO') || accion.startsWith('HABILITACION')) {
      return 'badge badge--trabajador';
    }
    if (accion.includes('RECUPERACION')) {
      return 'badge badge--suspendido';
    }
    return 'badge badge--neutral';
  }

  protected nombreActor(registro: RegistroAuditoria): string {
    return registro.actor ? `${registro.actor.nombres} ${registro.actor.apellidos}` : 'Sistema';
  }

  protected correoActor(registro: RegistroAuditoria): string {
    return registro.actor?.correo ?? 'Proceso automático';
  }

  protected formatearFecha(fecha: string): string {
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime()) ? '—' : this.formateadorFecha.format(valor);
  }

  protected idCorto(id: string | null): string {
    return id ? `${id.slice(0, 8)}…` : '—';
  }

  protected detalleJson(registro: RegistroAuditoria): string {
    return registro.detalle ? JSON.stringify(registro.detalle, null, 2) : 'Sin detalle adicional';
  }

  protected limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroAccion.set('TODAS');
  }

  protected mensajeCrear(campo: CampoCrearAdmin): string {
    const control = this.formCrear.controls[campo];

    if (!control || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return campo === 'confirmarContrasena'
        ? 'Confirma la contraseña.'
        : 'Este campo es obligatorio.';
    }

    if (campo === 'correo' && control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (control.hasError('maxlength')) {
      return campo === 'contrasena'
        ? 'La contraseña no puede superar 72 caracteres.'
        : 'No puede superar el máximo de caracteres permitido.';
    }

    if (campo === 'telefono' && control.hasError('pattern')) {
      return 'Usa entre 7 y 30 dígitos o caracteres válidos (+, -, espacios, paréntesis).';
    }

    if (campo === 'contrasena' && control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    return '';
  }

  protected contrasenasCrearNoCoinciden(): boolean {
    const confirmacion = this.formCrear.controls.confirmarContrasena;
    return this.formCrear.hasError('noCoinciden') && (confirmacion.touched || confirmacion.dirty);
  }

  protected mensajeEditar(campo: CampoEditarAdmin): string {
    const control = this.formEditar.controls[campo];

    if (!control || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (campo === 'correo' && control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    if (campo === 'telefono' && control.hasError('pattern')) {
      return 'Usa entre 7 y 30 dígitos o caracteres válidos (+, -, espacios, paréntesis).';
    }

    if (control.hasError('maxlength')) {
      return 'No puede superar el máximo de caracteres permitido.';
    }

    return '';
  }

  private rolesSeleccionados(): Rol[] {
    const valores = this.formEditar.controls.roles.getRawValue();
    return this.rolesDisponibles.filter((rol) => valores[rol]);
  }

  private cambiarEstado(admin: Usuario): void {
    const nuevoEstado: EstadoAdministrable = this.esActivo(admin) ? 'INACTIVO' : 'ACTIVO';

    this.cambiandoEstadoId.set(admin.id);
    this.errorAdmins.set('');
    this.exito.set('');

    this.superadminService.cambiarEstado(admin.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.cambiandoEstadoId.set(null);
        this.exito.set(
          `La cuenta de ${actualizado.nombres} ${actualizado.apellidos} quedó ${actualizado.estado.toLowerCase()}.`,
        );
        this.cargarAdmins(true);
        this.cargarAuditoria(true);
      },
      error: (error: unknown) => {
        this.cambiandoEstadoId.set(null);
        this.errorAdmins.set(mensajeDeError(error, 'No se pudo cambiar el estado de la cuenta.'));
      },
    });
  }
}
