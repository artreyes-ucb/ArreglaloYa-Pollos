import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionItem } from '../../core/models/requests.models';
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

  protected readonly notificaciones = signal<NotificacionItem[]>([]);
  protected readonly soloNoLeidas = signal(false);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.notificationsService.listar(this.soloNoLeidas()).subscribe({
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

  protected cambiarFiltro(soloNoLeidas: boolean): void {
    this.soloNoLeidas.set(soloNoLeidas);
    this.cargar();
  }

  protected marcarLeida(item: NotificacionItem): void {
    if (item.leida) {
      return;
    }

    this.notificationsService.marcarComoLeida(item.idNotificacion).subscribe({
      next: (actualizada) => {
        this.notificaciones.update((lista) =>
          this.soloNoLeidas()
            ? lista.filter((n) => n.idNotificacion !== item.idNotificacion)
            : lista.map((n) =>
                n.idNotificacion === item.idNotificacion ? actualizada : n,
              ),
        );
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

  protected abrirReferencia(item: NotificacionItem): void {
    if (!item.leida) {
      this.marcarLeida(item);
    }

    if (item.entidadRelacionada === 'solicitudes_servicio') {
      const rolActivo = this.auth.usuario()?.rolActivo;
      if (rolActivo === 'TRABAJADOR') {
        void this.router.navigate(['/worker-requests']);
      } else if (rolActivo === 'CLIENTE') {
        void this.router.navigate(['/requests']);
      }
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
    };
    return mapa[tipo] ?? tipo;
  }

  protected claseTipo(tipo: string): string {
    switch (tipo) {
      case 'SOLICITUD_PUBLICADA':
      case 'NUEVA_SOLICITUD_COMPATIBLE':
        return 'chip chip--trabajador';
      case 'SOLICITUD_PRIORIDAD_REDUCIDA':
        return 'chip chip--superadmin';
      case 'SOLICITUD_CANCELADA':
      case 'SOLICITUD_VENCIDA':
        return 'badge badge--inactivo';
      default:
        return 'chip chip--cliente';
    }
  }
}
