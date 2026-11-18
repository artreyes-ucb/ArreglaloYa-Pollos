import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificacionItem, NotificacionesResponse } from '../models/requests.models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly totalNoLeidas = signal<number>(0);

  listar(soloNoLeidas = false): Observable<NotificacionesResponse> {
    let params = new HttpParams();
    if (soloNoLeidas) {
      params = params.set('soloNoLeidas', 'true');
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

  marcarTodasComoLeidas(): Observable<{ actualizadas: number; mensaje: string }> {
    return this.http
      .patch<{ actualizadas: number; mensaje: string }>(`${this.baseUrl}/read-all`, {})
      .pipe(
        tap(() => {
          this.totalNoLeidas.set(0);
        }),
      );
  }

  limpiarContador(): void {
    this.totalNoLeidas.set(0);
  }
}
