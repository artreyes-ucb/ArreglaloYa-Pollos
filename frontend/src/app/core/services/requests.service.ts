import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogosSolicitudes,
  CreateSolicitudPayload,
  SearchSolicitudesParams,
  SearchSolicitudesResponse,
  SolicitudServicioDetalle,
  SolicitudServicioItem,
  UpdateSolicitudPayload,
  UploadFotoResponse,
  WhatsappLinkResponse,
} from '../models/requests.models';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/requests`;
  private readonly apiOrigin = environment.apiUrl.replace(/\/api\/?$/, '');

  obtenerCatalogos(): Observable<CatalogosSolicitudes> {
    return this.http.get<CatalogosSolicitudes>(`${this.baseUrl}/catalogs`);
  }

  subirFotografia(archivo: File): Observable<UploadFotoResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<UploadFotoResponse>(`${this.baseUrl}/upload-photo`, formData);
  }

  crearSolicitud(payload: CreateSolicitudPayload): Observable<SolicitudServicioDetalle> {
    return this.http.post<SolicitudServicioDetalle>(this.baseUrl, payload);
  }

  listarMisSolicitudes(estado?: string): Observable<SolicitudServicioItem[]> {
    let params = new HttpParams();
    if (estado && estado.trim()) {
      params = params.set('estado', estado.trim());
    }
    return this.http.get<SolicitudServicioItem[]>(`${this.baseUrl}/mine`, { params });
  }

  buscarSolicitudes(filtros: SearchSolicitudesParams): Observable<SearchSolicitudesResponse> {
    let params = new HttpParams();
    if (filtros.idCategoria) {
      params = params.set('idCategoria', String(filtros.idCategoria));
    }
    if (filtros.idZona) {
      params = params.set('idZona', String(filtros.idZona));
    }
    if (filtros.q && filtros.q.trim()) {
      params = params.set('q', filtros.q.trim());
    }
    if (filtros.soloMisCoincidencias) {
      params = params.set('soloMisCoincidencias', 'true');
    }

    return this.http.get<SearchSolicitudesResponse>(`${this.baseUrl}/search`, { params });
  }

  obtenerDetalle(idSolicitud: string): Observable<SolicitudServicioDetalle> {
    return this.http.get<SolicitudServicioDetalle>(`${this.baseUrl}/${idSolicitud}`);
  }

  modificarSolicitud(
    idSolicitud: string,
    payload: UpdateSolicitudPayload,
  ): Observable<SolicitudServicioDetalle> {
    return this.http.patch<SolicitudServicioDetalle>(`${this.baseUrl}/${idSolicitud}`, payload);
  }

  cancelarSolicitud(
    idSolicitud: string,
    motivo?: string,
  ): Observable<{ mensaje: string; solicitud: SolicitudServicioDetalle }> {
    return this.http.patch<{ mensaje: string; solicitud: SolicitudServicioDetalle }>(
      `${this.baseUrl}/${idSolicitud}/cancel`,
      motivo ? { motivo } : {},
    );
  }

  generarEnlaceWhatsapp(
    idSolicitud: string,
    idPerfilTrabajador?: string,
  ): Observable<WhatsappLinkResponse> {
    let params = new HttpParams();
    if (idPerfilTrabajador) {
      params = params.set('idPerfilTrabajador', idPerfilTrabajador);
    }
    return this.http.get<WhatsappLinkResponse>(`${this.baseUrl}/${idSolicitud}/whatsapp-link`, {
      params,
    });
  }

  resolverUrlImagen(rutaImagen: string): string {
    if (!rutaImagen) {
      return '';
    }
    if (/^https?:\/\//i.test(rutaImagen)) {
      return rutaImagen;
    }
    return `${this.apiOrigin}${rutaImagen.startsWith('/') ? '' : '/'}${rutaImagen}`;
  }
}
