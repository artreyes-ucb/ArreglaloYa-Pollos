import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FiltrosNotificacionesQuery,
  NotificacionItem,
  PreferenciasNotificacion,
} from '../../core/models/requests.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  protected readonly notificationsService = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Lista y estado general
  protected readonly notificaciones = signal<NotificacionItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  // Filtros interactivos
  protected readonly filtroLectura = signal<'todas' | 'no_leidas' | 'leidas'>('todas');
  protected readonly filtroTipo = signal<string>('');
  protected readonly busquedaTexto = signal<string>('');

  // Preferencias de notificaciones (HU configurable)
  protected readonly modalPreferenciasAbierto = signal(false);
  protected readonly cargandoPreferencias = signal(false);
  protected readonly guardandoPreferencias = signal(false);
  protected readonly errorPreferencias = signal('');
  protected readonly exitoPreferencias = signal('');

  protected readonly prefSolicitudes = signal(true);
  protected readonly prefCotizaciones = signal(true);
  protected readonly prefServicios = signal(true);
  protected readonly prefPagos = signal(true);
  protected readonly prefReclamos = signal(true);
  protected readonly prefSistema = signal(true);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    const query: FiltrosNotificacionesQuery = {};

    if (this.filtroLectura() === 'no_leidas') {
      query.leida = false;
    } else if (this.filtroLectura() === 'leidas') {
      query.leida = true;
    }

    if (this.filtroTipo()) {
      query.tipo = this.filtroTipo();
    }

    if (this.busquedaTexto().trim()) {
      query.q = this.busquedaTexto().trim();
    }

    this.notificationsService.listar(query).subscribe({
      next: (res) => {
        this.notificaciones.set(res.notificaciones);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar tus notificaciones.'));
      },
    });
  }

  protected cambiarFiltroLectura(opcion: 'todas' | 'no_leidas' | 'leidas'): void {
    this.filtroLectura.set(opcion);
    this.cargar();
  }

  protected cambiarFiltroTipo(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    this.filtroTipo.set(valor);
    this.cargar();
  }

  protected onBuscarTexto(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.busquedaTexto.set(valor);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.filtroLectura.set('todas');
    this.filtroTipo.set('');
    this.busquedaTexto.set('');
    this.cargar();
  }

  protected marcarLeida(item: NotificacionItem): void {
    if (item.leida) {
      return;
    }

    this.notificationsService.marcarComoLeida(item.idNotificacion).subscribe({
      next: (actualizada) => {
        this.notificaciones.update((lista) =>
          lista.map((n) =>
            n.idNotificacion === item.idNotificacion ? actualizada : n,
          ),
        );
        if (this.filtroLectura() === 'no_leidas') {
          this.notificaciones.update((lista) =>
            lista.filter((n) => n.idNotificacion !== item.idNotificacion),
          );
        }
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err, 'No se pudo actualizar la notificación.'));
      },
    });
  }

  protected marcarNoLeida(item: NotificacionItem): void {
    if (!item.leida) {
      return;
    }

    this.notificationsService.marcarComoNoLeida(item.idNotificacion).subscribe({
      next: (actualizada) => {
        this.notificaciones.update((lista) =>
          lista.map((n) =>
            n.idNotificacion === item.idNotificacion ? actualizada : n,
          ),
        );
        if (this.filtroLectura() === 'leidas') {
          this.notificaciones.update((lista) =>
            lista.filter((n) => n.idNotificacion !== item.idNotificacion),
          );
        }
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err, 'No se pudo actualizar la notificación.'));
      },
    });
  }

  protected marcarTodasLeidas(): void {
    if (this.procesando()) {
      return;
    }

    this.procesando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.notificationsService.marcarTodasComoLeidas().subscribe({
      next: (res) => {
        this.procesando.set(false);
        this.mensaje.set(res.mensaje);
        this.cargar();
      },
      error: (err: unknown) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudieron marcar las notificaciones.'));
      },
    });
  }

  // Métodos para el modal de preferencias
  protected abrirModalPreferencias(): void {
    this.modalPreferenciasAbierto.set(true);
    this.cargandoPreferencias.set(true);
    this.errorPreferencias.set('');
    this.exitoPreferencias.set('');

    this.notificationsService.obtenerPreferencias().subscribe({
      next: (pref: PreferenciasNotificacion) => {
        this.prefSolicitudes.set(pref.notifSolicitudes);
        this.prefCotizaciones.set(pref.notifCotizaciones);
        this.prefServicios.set(pref.notifServicios);
        this.prefPagos.set(pref.notifPagos);
        this.prefReclamos.set(pref.notifReclamos);
        this.prefSistema.set(pref.notifSistema);
        this.cargandoPreferencias.set(false);
      },
      error: (err: unknown) => {
        this.cargandoPreferencias.set(false);
        this.errorPreferencias.set(
          mensajeDeError(err, 'No se pudieron cargar tus preferencias de notificación.'),
        );
      },
    });
  }

  protected cerrarModalPreferencias(): void {
    this.modalPreferenciasAbierto.set(false);
    this.errorPreferencias.set('');
    this.exitoPreferencias.set('');
  }

  protected guardarPreferencias(): void {
    this.guardandoPreferencias.set(true);
    this.errorPreferencias.set('');
    this.exitoPreferencias.set('');

    this.notificationsService
      .actualizarPreferencias({
        notifSolicitudes: this.prefSolicitudes(),
        notifCotizaciones: this.prefCotizaciones(),
        notifServicios: this.prefServicios(),
        notifPagos: this.prefPagos(),
        notifReclamos: this.prefReclamos(),
        notifSistema: this.prefSistema(),
      })
      .subscribe({
        next: () => {
          this.guardandoPreferencias.set(false);
          this.exitoPreferencias.set('Preferencias guardadas exitosamente.');
          setTimeout(() => {
            if (this.modalPreferenciasAbierto()) {
              this.cerrarModalPreferencias();
            }
          }, 1200);
        },
        error: (err: unknown) => {
          this.guardandoPreferencias.set(false);
          this.errorPreferencias.set(
            mensajeDeError(err, 'No se pudieron guardar tus preferencias.'),
          );
        },
      });
  }

  protected togglePref(
    categoria: 'solicitudes' | 'cotizaciones' | 'servicios' | 'pagos' | 'reclamos' | 'sistema',
  ): void {
    switch (categoria) {
      case 'solicitudes':
        this.prefSolicitudes.update((v) => !v);
        break;
      case 'cotizaciones':
        this.prefCotizaciones.update((v) => !v);
        break;
      case 'servicios':
        this.prefServicios.update((v) => !v);
        break;
      case 'pagos':
        this.prefPagos.update((v) => !v);
        break;
      case 'reclamos':
        this.prefReclamos.update((v) => !v);
        break;
      case 'sistema':
        this.prefSistema.update((v) => !v);
        break;
    }
  }

  protected abrirReferencia(item: NotificacionItem): void {
    if (!item.leida) {
      this.marcarLeida(item);
    }

    const rolActivo = this.auth.usuario()?.rolActivo;

    if (item.entidadRelacionada === 'solicitudes_servicio') {
      if (rolActivo === 'TRABAJADOR') {
        void this.router.navigate(['/worker-requests']);
      } else {
        void this.router.navigate(['/requests']);
      }
    } else if (item.entidadRelacionada === 'servicios_programados') {
      if (rolActivo === 'TRABAJADOR') {
        void this.router.navigate(['/worker-agenda']);
      } else {
        void this.router.navigate(['/payments']);
      }
    } else if (item.entidadRelacionada === 'cotizaciones') {
      void this.router.navigate(['/requests']);
    } else if (item.entidadRelacionada === 'reclamos' || item.entidadRelacionada === 'pagos') {
      void this.router.navigate(['/payments']);
    }
  }

  protected etiquetaTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      SOLICITUD_PUBLICADA: 'Publicación',
      SOLICITUD_MODIFICADA: 'Actualización',
      SOLICITUD_CANCELADA: 'Cancelación',
      SOLICITUD_PRIORIDAD_REDUCIDA: 'Vigencia (3 días)',
      SOLICITUD_VENCIDA: 'Caducidad (30 días)',
      NUEVA_SOLICITUD_COMPATIBLE: 'Nueva oportunidad',
      COTIZACION: 'Cotización',
      VISITA_PREVIA: 'Visita previa',
      PROGRAMACION: 'Servicio programado',
      SERVICIO_TERMINADO_TRABAJADOR: 'Servicio terminado',
      SERVICIO_COMPLETADO: 'Servicio completado',
      SERVICIO_CANCELADO: 'Servicio cancelado',
      ANTICIPO_25: 'Anticipo 25%',
      ANTICIPO_REGISTRADO: 'Anticipo abonado',
      PAGO_FINAL: 'Pago final',
      PAGO_FINAL_REGISTRADO: 'Pago final registrado',
      REEMBOLSO_RESUELTO: 'Reembolso resuelto',
      RECLAMO_RECIBIDO: 'Reclamo recibido',
      RECLAMO_RESUELTO: 'Reclamo resuelto',
      NUEVA_EVALUACION: 'Nueva evaluación',
    };
    return mapa[tipo] ?? tipo;
  }

  protected claseTipo(tipo: string): string {
    switch (tipo) {
      case 'SOLICITUD_PUBLICADA':
      case 'NUEVA_SOLICITUD_COMPATIBLE':
        return 'chip chip--trabajador';
      case 'COTIZACION':
        return 'chip chip--cliente';
      case 'VISITA_PREVIA':
      case 'PROGRAMACION':
      case 'SERVICIO_COMPLETADO':
        return 'chip chip--activo';
      case 'ANTICIPO_REGISTRADO':
      case 'PAGO_FINAL_REGISTRADO':
      case 'REEMBOLSO_RESUELTO':
        return 'chip chip--pagos';
      case 'SOLICITUD_PRIORIDAD_REDUCIDA':
      case 'RECLAMO_RECIBIDO':
        return 'chip chip--superadmin';
      case 'SOLICITUD_CANCELADA':
      case 'SOLICITUD_VENCIDA':
      case 'SERVICIO_CANCELADO':
        return 'badge badge--inactivo';
      default:
        return 'chip chip--cliente';
    }
  }
}
