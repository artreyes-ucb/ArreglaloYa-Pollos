import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DisponibilidadTrabajador {
  idDisponibilidad?: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
}

export interface SolicitudAgenda {
  idSolicitud: string;
  descripcion: string;
  ubicacionGeneral: string;
  estado: string;
  cliente?: { nombres?: string; apellidos?: string; correo?: string };
}

export interface ServicioProgramado {
  idProgramacion: string;
  fechaServicio: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  solicitud: SolicitudAgenda;
}

export interface ProgramarServicioPayload {
  idSolicitud: string;
  fechaServicio: string;
  horaInicio: string;
  horaFin: string;
}

@Injectable({ providedIn: 'root' })
export class WorkersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/workers`;

  obtenerDisponibilidad(): Observable<DisponibilidadTrabajador[]> {
    return this.http.get<DisponibilidadTrabajador[]>(`${this.baseUrl}/me/availability`);
  }

  guardarDisponibilidad(payload: DisponibilidadTrabajador): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/me/availability`, payload);
  }

  obtenerAgenda(): Observable<ServicioProgramado[]> {
    return this.http.get<ServicioProgramado[]>(`${this.baseUrl}/me/schedule`);
  }

  programarServicio(payload: ProgramarServicioPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/me/schedule`, payload);
  }
}
