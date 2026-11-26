
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  CategoriaServicioItem,
  SolicitudServicioItem,
  WhatsappLinkResponse,
  ZonaItem,
} from '../../core/models/requests.models';

import { CrearCotizacionPayload } from '../../core/models/quotations.models';
import { ReprogramacionVisitaItem, VisitaPreviaItem } from '../../core/models/visits.models';
import { QuotationsService } from '../../core/services/quotations.service';
import { RequestsService } from '../../core/services/requests.service';
import { VisitsService } from '../../core/services/visits.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-worker-requests',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './worker-requests.component.html',
  styleUrl: './worker-requests.component.css',
})
export class WorkerRequestsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  protected readonly requestsService = inject(RequestsService);
  private readonly quotationsService = inject(QuotationsService);
  private readonly visitsService = inject(VisitsService);

  protected readonly categorias = signal<CategoriaServicioItem[]>([]);
  protected readonly zonas = signal<ZonaItem[]>([]);
  protected readonly solicitudes = signal<SolicitudServicioItem[]>([]);
  protected readonly totalResultados = signal(0);
  protected readonly estadoValidacion = signal<string>('');
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal('');

  protected readonly detalleSolicitud = signal<SolicitudServicioItem | null>(null);

  protected readonly whatsappModal = signal<WhatsappLinkResponse | null>(null);
  protected readonly cargandoWhatsapp = signal(false);
  protected readonly errorWhatsapp = signal('');

  protected readonly enviandoCotizacion = signal(false);
  protected readonly cotizacionEnviada = signal(false);
  protected readonly mensajeCotizacion = signal('');
  protected readonly errorCotizacion = signal('');
  protected readonly visitas = signal<VisitaPreviaItem[]>([]);
  protected readonly cargandoVisitas = signal(false);
  protected readonly errorVisitas = signal('');
  protected readonly guardandoVisita = signal(false);
  protected readonly guardandoReprogramacion = signal(false);
  protected readonly reprogramandoVisitaId = signal<string | null>(null);
  protected readonly respuestaReprogramacionId = signal<string | null>(null);
  protected readonly visitaForm = this.fb.nonNullable.group({ fechaPropuesta: ['', [Validators.required]], horaPropuesta: ['', [Validators.required]], resultado: [''] });
  protected readonly reprogramForm = this.fb.nonNullable.group({ fechaPropuesta: ['', [Validators.required]], horaInicioPropuesta: ['', [Validators.required]], horaFinPropuesta: ['', [Validators.required]], motivo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]] });

  protected readonly filtrosForm = this.fb.nonNullable.group({
    idCategoria: [0],
    idZona: [0],
    q: [''],
    soloMisCoincidencias: [false],
  });

  protected readonly cotizacionForm = this.fb.nonNullable.group({
    precioManoObra: [0, [Validators.required, Validators.min(0)]],
    precioMateriales: [0, [Validators.required, Validators.min(0)]],
    alcance: ['', [Validators.required, Validators.minLength(5)]],
    condiciones: [''],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.buscar();
  }

  protected cargarCatalogos(): void {
    this.requestsService.obtenerCatalogos().subscribe({
      next: (res) => {
        this.categorias.set(res.categorias);
        this.zonas.set(res.zonas);
      },
      error: () => {
        // Silencioso si falla la carga de catálogos.
      },
    });
  }

  protected buscar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    const raw = this.filtrosForm.getRawValue();

    this.requestsService
      .buscarSolicitudes({
        idCategoria: Number(raw.idCategoria) > 0 ? Number(raw.idCategoria) : null,
        idZona: Number(raw.idZona) > 0 ? Number(raw.idZona) : null,
        q: raw.q.trim() || undefined,
        soloMisCoincidencias: raw.soloMisCoincidencias,
      })
      .subscribe({
        next: (res) => {
          this.solicitudes.set(res.solicitudes);
          this.totalResultados.set(res.total);
          this.estadoValidacion.set(res.perfilTrabajador.estadoValidacion);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.errorCarga.set(
            mensajeDeError(err, 'No se pudieron cargar las solicitudes.'),
          );
        },
      });
  }

  protected limpiarFiltros(): void {
    this.filtrosForm.reset({
      idCategoria: 0,
      idZona: 0,
      q: '',
      soloMisCoincidencias: false,
    });

    this.buscar();
  }

  protected abrirDetalle(solicitud: SolicitudServicioItem): void {
    this.detalleSolicitud.set(solicitud);
    this.cotizacionEnviada.set(false);
    this.mensajeCotizacion.set('');
    this.errorCotizacion.set('');

    this.cotizacionForm.reset({
      precioManoObra: 0,
      precioMateriales: 0,
      alcance: '',
      condiciones: '',
    });

    this.cargarVisitas(solicitud.idSolicitud);
  }

  protected cerrarDetalle(): void {
    this.detalleSolicitud.set(null);
  }

  protected puedeEnviarCotizacion(solicitud: SolicitudServicioItem): boolean {
    return (
      this.estadoValidacion() === 'APROBADO' &&
      ['ACTIVA', 'PRIORIDAD_REDUCIDA', 'EN_COTIZACION'].includes(solicitud.estado) &&
      !this.cotizacionEnviada()
    );
  }

  protected calcularTotalCotizacion(): number {
    const valores = this.cotizacionForm.getRawValue();

    return (
      Number(valores.precioManoObra || 0) +
      Number(valores.precioMateriales || 0)
    );
  }

  protected enviarCotizacion(solicitud: SolicitudServicioItem): void {
    this.errorCotizacion.set('');
    this.mensajeCotizacion.set('');

    if (!this.puedeEnviarCotizacion(solicitud)) {
      this.errorCotizacion.set(
        'No puedes enviar una cotización para esta solicitud o tu perfil no está aprobado.',
      );
      return;
    }

    if (this.cotizacionForm.invalid) {
      this.cotizacionForm.markAllAsTouched();
      this.errorCotizacion.set(
        'Revisa los campos obligatorios y los importes de la cotización.',
      );
      return;
    }

    const valores = this.cotizacionForm.getRawValue();

    const payload: CrearCotizacionPayload = {
      idSolicitud: solicitud.idSolicitud,
      precioManoObra: Number(valores.precioManoObra),
      precioMateriales: Number(valores.precioMateriales),
      alcance: valores.alcance.trim(),
      condiciones: valores.condiciones.trim() || undefined,
    };

    this.enviandoCotizacion.set(true);

    this.quotationsService.crearCotizacion(payload).subscribe({
      next: () => {
        this.enviandoCotizacion.set(false);
        this.cotizacionEnviada.set(true);
        this.mensajeCotizacion.set(
          '¡Cotización enviada correctamente! El cliente podrá revisarla y responder.',
        );

        this.buscar();
      },
      error: (err: unknown) => {
        this.enviandoCotizacion.set(false);
        this.errorCotizacion.set(
          mensajeDeError(err, 'No se pudo enviar la cotización. Intenta nuevamente.'),
        );
      },
    });
  }

  protected cargarVisitas(idSolicitud: string): void {
    this.cargandoVisitas.set(true); this.errorVisitas.set('');
    this.visitsService.listarPorSolicitud(idSolicitud).subscribe({
      next: (l) => { this.visitas.set(l); this.cargandoVisitas.set(false); },
      error: (e: unknown) => { this.cargandoVisitas.set(false); this.errorVisitas.set(mensajeDeError(e,'No se pudieron cargar las visitas previas.')); },
    });
  }
  protected solicitarVisita(): void {
    const sol=this.detalleSolicitud(); if(!sol||this.visitaForm.invalid||this.guardandoVisita()){this.visitaForm.markAllAsTouched(); return;}
    const r=this.visitaForm.getRawValue(); this.guardandoVisita.set(true); this.errorVisitas.set('');
    this.visitsService.crear({idSolicitud:sol.idSolicitud, fechaPropuesta:r.fechaPropuesta, horaPropuesta:r.horaPropuesta, resultado:r.resultado.trim()||undefined}).subscribe({
      next:()=>{this.guardandoVisita.set(false); this.visitaForm.reset({fechaPropuesta:'',horaPropuesta:'',resultado:''}); this.cargarVisitas(sol.idSolicitud);},
      error:(e:unknown)=>{this.guardandoVisita.set(false); this.errorVisitas.set(mensajeDeError(e,'No se pudo registrar la visita previa.'));},
    });
  }
  protected responderVisita(v: VisitaPreviaItem, estado:'ACEPTADA'|'RECHAZADA'|'CANCELADA'|'REALIZADA'|'NO_REALIZADA'): void {
    if(this.guardandoVisita()) return; this.guardandoVisita.set(true); this.errorVisitas.set('');
    this.visitsService.responder(v.idVisita,{estado}).subscribe({
      next:()=>{this.guardandoVisita.set(false); const id=this.detalleSolicitud()?.idSolicitud; if(id) this.cargarVisitas(id);},
      error:(e:unknown)=>{this.guardandoVisita.set(false); this.errorVisitas.set(mensajeDeError(e,'No se pudo actualizar la visita previa.'));},
    });
  }

  protected iniciarReprogramacion(visita: VisitaPreviaItem): void {
    if (this.guardandoReprogramacion()) return;
    this.errorVisitas.set('');
    this.reprogramandoVisitaId.set(visita.idVisita);
    const fecha = visita.fechaConfirmada ?? visita.fechaPropuesta;
    const inicio = (visita.horaConfirmada ?? visita.horaPropuesta).slice(0, 5);
    const fin = (visita.horaFinConfirmada ?? visita.horaFinPropuesta ?? '').slice(0, 5);
    this.reprogramForm.reset({ fechaPropuesta: fecha, horaInicioPropuesta: inicio, horaFinPropuesta: fin, motivo: '' });
  }
  protected cancelarReprogramacionForm(): void {
    if (this.guardandoReprogramacion()) return;
    this.reprogramandoVisitaId.set(null);
    this.reprogramForm.reset({ fechaPropuesta: '', horaInicioPropuesta: '', horaFinPropuesta: '', motivo: '' });
  }
  protected enviarReprogramacion(visita: VisitaPreviaItem): void {
    if (this.reprogramForm.invalid || this.guardandoReprogramacion()) { this.reprogramForm.markAllAsTouched(); return; }
    const raw = this.reprogramForm.getRawValue();
    this.guardandoReprogramacion.set(true); this.errorVisitas.set('');
    this.visitsService.solicitarReprogramacion(visita.idVisita, { fechaPropuesta: raw.fechaPropuesta, horaInicioPropuesta: raw.horaInicioPropuesta, horaFinPropuesta: raw.horaFinPropuesta, motivo: raw.motivo.trim() }).subscribe({
      next: () => { this.guardandoReprogramacion.set(false); this.reprogramandoVisitaId.set(null); this.reprogramForm.reset({ fechaPropuesta: '', horaInicioPropuesta: '', horaFinPropuesta: '', motivo: '' }); const id=this.detalleSolicitud()?.idSolicitud; if(id) this.cargarVisitas(id); },
      error: (e: unknown) => { this.guardandoReprogramacion.set(false); this.errorVisitas.set(mensajeDeError(e, 'No se pudo solicitar la reprogramación.')); },
    });
  }
  protected responderReprogramacion(visita: VisitaPreviaItem, rep: ReprogramacionVisitaItem, decision: 'ACEPTADA' | 'RECHAZADA'): void {
    if (this.respuestaReprogramacionId()) return;
    this.respuestaReprogramacionId.set(rep.idReprogramacion); this.errorVisitas.set('');
    this.visitsService.responderReprogramacion(visita.idVisita, rep.idReprogramacion, { decision }).subscribe({
      next: () => { this.respuestaReprogramacionId.set(null); const id=this.detalleSolicitud()?.idSolicitud; if(id) this.cargarVisitas(id); },
      error: (e: unknown) => { this.respuestaReprogramacionId.set(null); this.errorVisitas.set(mensajeDeError(e, 'No se pudo responder la reprogramación.')); },
    });
  }
  protected cancelarReprogramacion(visita: VisitaPreviaItem, rep: ReprogramacionVisitaItem): void {
    if (this.respuestaReprogramacionId()) return;
    this.respuestaReprogramacionId.set(rep.idReprogramacion); this.errorVisitas.set('');
    this.visitsService.cancelarReprogramacion(visita.idVisita, rep.idReprogramacion).subscribe({
      next: () => { this.respuestaReprogramacionId.set(null); const id=this.detalleSolicitud()?.idSolicitud; if(id) this.cargarVisitas(id); },
      error: (e: unknown) => { this.respuestaReprogramacionId.set(null); this.errorVisitas.set(mensajeDeError(e, 'No se pudo cancelar la reprogramación.')); },
    });
  }
  protected reprogramacionPendiente(visita: VisitaPreviaItem): ReprogramacionVisitaItem | null {
    return (visita.reprogramaciones ?? []).find((r) => r.estado === 'PENDIENTE') ?? null;
  }
  protected puedeSolicitarReprogramacion(visita: VisitaPreviaItem): boolean {
    return ['SOLICITADA', 'ACEPTADA'].includes(visita.estado) && !this.reprogramacionPendiente(visita);
  }

  protected abrirWhatsapp(solicitud: SolicitudServicioItem): void {
    this.cargandoWhatsapp.set(true);
    this.errorWhatsapp.set('');

    this.requestsService.generarEnlaceWhatsapp(solicitud.idSolicitud).subscribe({
      next: (res) => {
        this.cargandoWhatsapp.set(false);
        this.whatsappModal.set(res);
      },
      error: (err: unknown) => {
        this.cargandoWhatsapp.set(false);
        this.errorWhatsapp.set(
          mensajeDeError(err, 'No se pudo generar el enlace de contacto por WhatsApp.'),
        );
      },
    });
  }

  protected cerrarWhatsapp(): void {
    this.whatsappModal.set(null);
  }

  protected etiquetaEstado(estado: string): string {
    const mapa: Record<string, string> = {
      ACTIVA: 'Activa',
      PRIORIDAD_REDUCIDA: 'Prioridad reducida (3+ días)',
      EN_COTIZACION: 'En cotización',
    };

    return mapa[estado] ?? estado;
  }

  protected claseEstado(estado: string): string {
    return estado === 'PRIORIDAD_REDUCIDA'
      ? 'badge badge--suspendido'
      : 'badge badge--activo';
  }
}
