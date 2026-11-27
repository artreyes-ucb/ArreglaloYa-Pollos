import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltrosNotificacionesQuery,
  NotificacionItem,
  NotificacionesResponse,
  PreferenciasNotificacion,
  UpdatePreferenciasPayload,
} from '../models/requests.models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly totalNoLeidas = signal<number>(0);

  listar(
    filtros?: boolean | FiltrosNotificacionesQuery,
  ): Observable<NotificacionesResponse> {
    let params = new HttpParams();

    if (typeof filtros === 'boolean') {
      if (filtros) {
        params = params.set('soloNoLeidas', 'true');
      }
    } else if (filtros) {
      if (filtros.soloNoLeidas) {
        params = params.set('soloNoLeidas', 'true');
      }
      if (filtros.leida !== undefined) {
        params = params.set('leida', String(filtros.leida));
      }
      if (filtros.tipo && filtros.tipo.trim()) {
        params = params.set('tipo', filtros.tipo.trim());
      }
      if (filtros.q && filtros.q.trim()) {
        params = params.set('q', filtros.q.trim());
      }
    }

    return this.http.get<NotificacionesResponse>(this.baseUrl, { params }).pipe(
      tap((respuesta) => {
        this.totalNoLeidas.set(respuesta.totalNoLeidas);
      }),
    );
  }

  refrescarContador(): void {
    this.http.get<{ totalNoLeidas: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: (res) => this.totalNoLeidas.set(res.totalNoLeidas),
      error: () => {
        // Silencioso si no hay sesión activa o expiró el token
      },
    });
  }

  marcarComoLeida(idNotificacion: string): Observable<NotificacionItem> {
    return this.http
      .patch<NotificacionItem>(`${this.baseUrl}/${idNotificacion}/read`, {})
      .pipe(
        tap(() => {
          this.totalNoLeidas.update((actual) => Math.max(0, actual - 1));
        }),
      );
  }

  marcarComoNoLeida(idNotificacion: string): Observable<NotificacionItem> {
    return this.http
      .patch<NotificacionItem>(`${this.baseUrl}/${idNotificacion}/unread`, {})
      .pipe(
        tap(() => {
          this.totalNoLeidas.update((actual) => actual + 1);
        }),
      );
  }

  marcarTodasComoLeidas(): Observable<{ actualizadas: number; mensaje: string }> {
    return this.http
      .patch<{ actualizadas: number; mensaje: string }>(`${this.baseUrl}/read-all`, {})
      .pipe(
        tap(() => {
          this.totalNoLeidas.set(0);
        }),
      );
  }

  obtenerPreferencias(): Observable<PreferenciasNotificacion> {
    return this.http.get<PreferenciasNotificacion>(`${this.baseUrl}/preferences`);
  }

  actualizarPreferencias(
    payload: UpdatePreferenciasPayload,
  ): Observable<PreferenciasNotificacion> {
    return this.http.patch<PreferenciasNotificacion>(
      `${this.baseUrl}/preferences`,
      payload,
    );
  }

  limpiarContador(): void {
    this.totalNoLeidas.set(0);
  }
}
