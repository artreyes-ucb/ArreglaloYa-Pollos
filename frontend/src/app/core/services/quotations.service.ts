
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  CotizacionItem,
  CrearCotizacionPayload,
  ResponderCotizacionPayload,
} from '../models/quotations.models';

@Injectable({ providedIn: 'root' })
export class QuotationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/quotations`;

  crearCotizacion(payload: CrearCotizacionPayload): Observable<CotizacionItem> {
    return this.http.post<CotizacionItem>(this.baseUrl, payload);
  }

  listarPorSolicitud(idSolicitud: string): Observable<CotizacionItem[]> {
    return this.http.get<CotizacionItem[]>(
      `${this.baseUrl}/request/${idSolicitud}`,
    );
  }

  responderCotizacion(
    idCotizacion: string,
    payload: ResponderCotizacionPayload,
  ): Observable<CotizacionItem> {
    return this.http.patch<CotizacionItem>(
      `${this.baseUrl}/${idCotizacion}/response`,
      payload,
    );
  }
}
