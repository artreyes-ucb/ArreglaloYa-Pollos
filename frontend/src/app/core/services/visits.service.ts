import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrearVisitaPreviaPayload, ResponderVisitaPreviaPayload, VisitaPreviaItem } from '../models/visits.models';

@Injectable({ providedIn: 'root' })
export class VisitsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/visits`;

  crear(payload: CrearVisitaPreviaPayload): Observable<VisitaPreviaItem> {
    return this.http.post<VisitaPreviaItem>(this.baseUrl, payload);
  }

  listarPorSolicitud(idSolicitud: string): Observable<VisitaPreviaItem[]> {
    return this.http.get<VisitaPreviaItem[]>(`${this.baseUrl}/request/${idSolicitud}`);
  }

  responder(idVisita: string, payload: ResponderVisitaPreviaPayload): Observable<VisitaPreviaItem> {
    return this.http.patch<VisitaPreviaItem>(`${this.baseUrl}/${idVisita}/response`, payload);
  }
}
