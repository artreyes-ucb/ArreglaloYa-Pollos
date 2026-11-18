import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Rol, RolAlternable } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly cambiandoRol = signal(false);
  protected readonly errorRol = signal('');

  protected readonly rolOpuesto = computed<RolAlternable>(() =>
    this.auth.usuario()?.rolActivo === 'TRABAJADOR' ? 'CLIENTE' : 'TRABAJADOR',
  );

  ngOnInit(): void {
    if (this.auth.estaAutenticado()) {
      this.notifications.refrescarContador();
    }
  }

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected cambiarRol(): void {
    if (this.cambiandoRol()) {
      return;
    }

    const destinoRol = this.rolOpuesto();
    this.cambiandoRol.set(true);
    this.errorRol.set('');

    this.auth.switchRole(destinoRol).subscribe({
      next: () => {
        this.cambiandoRol.set(false);
        this.cerrarMenu();
        this.notifications.refrescarContador();

        const urlActual = this.router.url;
        if (destinoRol === 'TRABAJADOR' && urlActual.startsWith('/requests')) {
          void this.router.navigate(['/worker-requests']);
        } else if (
          destinoRol === 'CLIENTE' &&
          (urlActual.startsWith('/worker-requests') || urlActual.startsWith('/worker-agenda'))
        ) {
          void this.router.navigate(['/requests']);
        }
      },
      error: (error: unknown) => {
        this.cambiandoRol.set(false);
        this.errorRol.set(mensajeDeError(error, 'No se pudo cambiar de rol.'));
      },
    });
  }

  protected salir(): void {
    this.cerrarMenu();
    this.notifications.limpiarContador();
    this.auth.logout();
  }

  protected claseRol(rol: Rol | undefined): string {
    const sufijo = (rol ?? 'CLIENTE').toLowerCase();
    return `badge badge--${sufijo}`;
  }
}
