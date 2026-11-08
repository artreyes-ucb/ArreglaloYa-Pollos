import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateAdminPayload,
  EstadoAdministrable,
  RegistroAuditoria,
  UpdateAdminPayload,
  Usuario,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/superadmin`;

  listarAdmins(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/admins`);
  }

  crearAdmin(payload: CreateAdminPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.baseUrl}/admins`, payload);
  }

  actualizarAdmin(id: string, payload: UpdateAdminPayload): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.baseUrl}/admins/${id}`, payload);
  }

  cambiarEstado(id: string, estado: EstadoAdministrable): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.baseUrl}/admins/${id}/estado`, { estado });
  }

  listarAuditoria(): Observable<RegistroAuditoria[]> {
    return this.http.get<RegistroAuditoria[]>(`${this.baseUrl}/audit-logs`);
  }
}
