import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Rol, RolAlternable } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);

  protected readonly menuAbierto = signal(false);
  protected readonly cambiandoRol = signal(false);
  protected readonly errorRol = signal('');

  protected readonly rolOpuesto = computed<RolAlternable>(() =>
    this.auth.usuario()?.rolActivo === 'TRABAJADOR' ? 'CLIENTE' : 'TRABAJADOR',
  );

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

    this.cambiandoRol.set(true);
    this.errorRol.set('');

    this.auth.switchRole(this.rolOpuesto()).subscribe({
      next: () => {
        this.cambiandoRol.set(false);
        this.cerrarMenu();
      },
      error: (error: unknown) => {
        this.cambiandoRol.set(false);
        this.errorRol.set(mensajeDeError(error, 'No se pudo cambiar de rol.'));
      },
    });
  }

  protected salir(): void {
    this.cerrarMenu();
    this.auth.logout();
  }

  protected claseRol(rol: Rol | undefined): string {
    const sufijo = (rol ?? 'CLIENTE').toLowerCase();
    return `badge badge--${sufijo}`;
  }
}
