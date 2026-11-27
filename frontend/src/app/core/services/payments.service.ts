import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoriaComisionItem,
  ComisionItem,
  EvaluacionItem,
  PagoItem,
  ReclamoItem,
  ReembolsoItem,
  ServicioEconomicoItem,
} from '../models/payments.models';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  listarCategoriasComision(): Observable<CategoriaComisionItem[]> {
    return this.http.get<CategoriaComisionItem[]>(`${this.baseUrl}/categories/commissions`);
  }

  actualizarComisionCategoria(
    idCategoria: number,
    porcentajeComision: number,
  ): Observable<CategoriaComisionItem> {
    return this.http.patch<CategoriaComisionItem>(
      `${this.baseUrl}/categories/${idCategoria}/commission`,
      { porcentajeComision },
    );
  }

  listarMisServicios(): Observable<ServicioEconomicoItem[]> {
    return this.http.get<ServicioEconomicoItem[]>(`${this.baseUrl}/services`);
  }

  registrarAnticipo(
    idProgramacion: string,
    payload: { precioAcordado: number; referencia?: string },
  ): Observable<PagoItem> {
    return this.http.post<PagoItem>(
      `${this.baseUrl}/services/${idProgramacion}/anticipo`,
      payload,
    );
  }

  registrarPagoFinal(
    idProgramacion: string,
    payload: { monto: number; referencia?: string },
  ): Observable<PagoItem> {
    return this.http.post<PagoItem>(
      `${this.baseUrl}/services/${idProgramacion}/pago-final`,
      payload,
    );
  }

  confirmarPagoBilateral(
    idPago: string,
    payload: { montoReportado: number; referencia?: string },
  ): Observable<PagoItem> {
    return this.http.patch<PagoItem>(`${this.baseUrl}/${idPago}/confirm`, payload);
  }

  calcularComision(idProgramacion: string): Observable<ComisionItem> {
    return this.http.post<ComisionItem>(
      `${this.baseUrl}/services/${idProgramacion}/comision`,
      {},
    );
  }

  marcarTerminadoTrabajador(idProgramacion: string): Observable<ServicioEconomicoItem> {
    return this.http.patch<ServicioEconomicoItem>(
      `${this.baseUrl}/services/${idProgramacion}/worker-finish`,
      {},
    );
  }

  confirmarConclusionCliente(idProgramacion: string): Observable<ServicioEconomicoItem> {
    return this.http.patch<ServicioEconomicoItem>(
      `${this.baseUrl}/services/${idProgramacion}/client-confirm`,
      {},
    );
  }

  cancelarServicio(
    idProgramacion: string,
    motivo: string,
  ): Observable<ServicioEconomicoItem> {
    return this.http.patch<ServicioEconomicoItem>(
      `${this.baseUrl}/services/${idProgramacion}/cancel`,
      { motivo },
    );
  }

  solicitarReembolso(idProgramacion: string, motivo: string): Observable<ReembolsoItem> {
    return this.http.post<ReembolsoItem>(
      `${this.baseUrl}/services/${idProgramacion}/reembolso`,
      { motivo },
    );
  }

  resolverReembolso(
    idReembolso: string,
    payload: { estado: 'APROBADO' | 'RECHAZADO' | 'COMPLETADO'; observacionAdmin?: string },
  ): Observable<ReembolsoItem> {
    return this.http.patch<ReembolsoItem>(
      `${this.baseUrl}/reembolsos/${idReembolso}/resolve`,
      payload,
    );
  }

  crearEvaluacion(
    idProgramacion: string,
    payload: { puntuacion: number; comentario?: string },
  ): Observable<EvaluacionItem> {
    return this.http.post<EvaluacionItem>(
      `${this.baseUrl}/services/${idProgramacion}/evaluacion`,
      payload,
    );
  }

  crearReclamo(
    idProgramacion: string,
    payload: { descripcion: string; evidenciaUrl?: string },
  ): Observable<ReclamoItem> {
    return this.http.post<ReclamoItem>(
      `${this.baseUrl}/services/${idProgramacion}/reclamo`,
      payload,
    );
  }

  resolverReclamo(
    idReclamo: string,
    payload: { estado: 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO' | 'CERRADO'; resolucion: string },
  ): Observable<ReclamoItem> {
    return this.http.patch<ReclamoItem>(
      `${this.baseUrl}/reclamos/${idReclamo}/resolve`,
      payload,
    );
  }
}