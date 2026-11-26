
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CategoriaServicioItem,
  FotografiaSolicitudPayload,
  HistoryPaginatedResponse,
  HistoryQueryParams,
  SolicitudServicioDetalle,
  SolicitudServicioItem,
  WhatsappLinkResponse,
  ZonaItem,
} from '../../core/models/requests.models';

import {
  CotizacionItem,
  DecisionCotizacion,
} from '../../core/models/quotations.models';
import { VisitaPreviaItem } from '../../core/models/visits.models';

import { NotificationsService } from '../../core/services/notifications.service';
import { QuotationsService } from '../../core/services/quotations.service';
import { RequestsService } from '../../core/services/requests.service';
import { VisitsService } from '../../core/services/visits.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-client-requests',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './client-requests.component.html',
  styleUrl: './client-requests.component.css',
})
export class ClientRequestsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  protected readonly requestsService = inject(RequestsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly quotationsService = inject(QuotationsService);
  private readonly visitsService = inject(VisitsService);

  protected readonly categorias = signal<CategoriaServicioItem[]>([]);
  protected readonly zonas = signal<ZonaItem[]>([]);
  protected readonly solicitudes = signal<SolicitudServicioItem[]>([]);
  protected readonly filtroEstado = signal<string>('');
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly mensajeExito = signal('');

  // Modal crear / editar
  protected readonly modalFormAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardandoForm = signal(false);
  protected readonly errorForm = signal('');
  protected readonly fotosAdjuntas = signal<FotografiaSolicitudPayload[]>([]);
  protected readonly subiendoFoto = signal(false);

  // Modal detalle e historial
  protected readonly detalleAbierto = signal<SolicitudServicioDetalle | null>(null);
  protected readonly cargandoDetalle = signal(false);

  // Historial avanzado
  protected readonly historial = signal<HistoryPaginatedResponse>({
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      order: 'DESC',
      filtrosDisponibles: { tiposEvento: [], actores: [] },
    },
  });
  protected readonly cargandoHistorial = signal(false);
  protected readonly filtros = signal<HistoryQueryParams>({});

  // Cotizaciones recibidas
  protected readonly cotizaciones = signal<CotizacionItem[]>([]);
  protected readonly cargandoCotizaciones = signal(false);
  protected readonly errorCotizaciones = signal('');
  protected readonly cotizacionRespondiendo = signal<string | null>(null);

  // Visitas previas
  protected readonly visitas = signal<VisitaPreviaItem[]>([]);
  protected readonly cargandoVisitas = signal(false);
  protected readonly errorVisitas = signal('');
  protected readonly guardandoVisita = signal(false);
  protected readonly visitaForm = this.fb.nonNullable.group({
    fechaPropuesta: ['', [Validators.required]],
    horaPropuesta: ['', [Validators.required]],
    resultado: [''],
  });

  // Modal cancelar
  protected readonly solicitudACancelar = signal<SolicitudServicioItem | null>(null);
  protected readonly cancelando = signal(false);
  protected readonly errorCancelar = signal('');

  // Modal WhatsApp (CU-25 / HU-F20)
  protected readonly whatsappModal = signal<WhatsappLinkResponse | null>(null);
  protected readonly cargandoWhatsapp = signal(false);
  protected readonly errorWhatsapp = signal('');

  protected readonly hoyIso = new Date().toISOString().slice(0, 10);

  protected readonly formulario = this.fb.nonNullable.group({
    idCategoria: [0, [Validators.required, Validators.min(1)]],
    idZona: [0, [Validators.required, Validators.min(1)]],
    ubicacionGeneral: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200),
      ],
    ],
    fechaPreferida: [''],
    descripcion: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(2000),
      ],
    ],
  });

  protected readonly formCancelar = this.fb.nonNullable.group({
    motivo: ['', [Validators.maxLength(300)]],
  });

  protected readonly resumenEstados = computed(() => {
    const lista = this.solicitudes();

    return {
      total: lista.length,
      activas: lista.filter(
        (s) => s.estado === 'ACTIVA' || s.estado === 'EN_COTIZACION',
      ).length,
      prioridadReducida: lista.filter(
        (s) => s.estado === 'PRIORIDAD_REDUCIDA',
      ).length,
      programadas: lista.filter(
        (s) => s.estado === 'PROGRAMADA' || s.estado === 'CONTRATADA',
      ).length,
      cerradas: lista.filter(
        (s) =>
          s.estado === 'CANCELADA' ||
          s.estado === 'VENCIDA' ||
          s.estado === 'COMPLETADA',
      ).length,
    };
  });

  protected readonly solicitudesFiltradas = computed(() => {
    const filtro = this.filtroEstado();

    if (!filtro) {
      return this.solicitudes();
    }

    return this.solicitudes().filter((s) => s.estado === filtro);
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarSolicitudes();
  }

  protected cargarCatalogos(): void {
    this.requestsService.obtenerCatalogos().subscribe({
      next: (res) => {
        this.categorias.set(res.categorias);
        this.zonas.set(res.zonas);
      },
      error: () => {
        // El error principal se mostrará al intentar publicar si falló el catálogo.
      },
    });
  }

  protected cargarSolicitudes(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.requestsService.listarMisSolicitudes().subscribe({
      next: (lista) => {
        this.solicitudes.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.errorCarga.set(
          mensajeDeError(err, 'No se pudieron cargar tus solicitudes.'),
        );
      },
    });
  }

  protected seleccionarFiltro(estado: string): void {
    this.filtroEstado.set(estado);
  }

  protected abrirNuevaSolicitud(): void {
    this.editandoId.set(null);
    this.errorForm.set('');
    this.fotosAdjuntas.set([]);

    this.formulario.reset({
      idCategoria: this.categorias()[0]?.idCategoria ?? 0,
      idZona: this.zonas()[0]?.idZona ?? 0,
      ubicacionGeneral: '',
      fechaPreferida: '',
      descripcion: '',
    });

    this.modalFormAbierto.set(true);
  }

  protected abrirEditarSolicitud(solicitud: SolicitudServicioItem): void {
    if (!solicitud.puedeModificar) {
      return;
    }

    this.editandoId.set(solicitud.idSolicitud);
    this.errorForm.set('');

    this.fotosAdjuntas.set(
      solicitud.fotografias.map((f) => ({
        rutaImagen: f.rutaImagen,
        descripcion: f.descripcion ?? undefined,
      })),
    );

    this.formulario.reset({
      idCategoria: solicitud.categoria?.idCategoria ?? 0,
      idZona: solicitud.zona?.idZona ?? 0,
      ubicacionGeneral: solicitud.ubicacionGeneral,
      fechaPreferida: solicitud.fechaPreferida ?? '',
      descripcion: solicitud.descripcion,
    });

    this.modalFormAbierto.set(true);
  }

  protected cerrarModalForm(): void {
    if (this.guardandoForm()) {
      return;
    }

    this.modalFormAbierto.set(false);
  }

  protected alSeleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    input.value = '';

    if (!archivo) {
      return;
    }

    if (this.fotosAdjuntas().length >= 5) {
      this.errorForm.set(
        'Puedes adjuntar como máximo 5 fotografías por solicitud.',
      );
      return;
    }

    this.subiendoFoto.set(true);
    this.errorForm.set('');

    this.requestsService.subirFotografia(archivo).subscribe({
      next: (res) => {
        this.fotosAdjuntas.update((actuales) => [
          ...actuales,
          {
            rutaImagen: res.rutaImagen,
            descripcion: res.nombreOriginal,
          },
        ]);

        this.subiendoFoto.set(false);
      },
      error: (err: unknown) => {
        this.subiendoFoto.set(false);
        this.errorForm.set(
          mensajeDeError(err, 'No se pudo subir la fotografía.'),
        );
      },
    });
  }

  protected eliminarFoto(indice: number): void {
    this.fotosAdjuntas.update((actuales) =>
      actuales.filter((_, i) => i !== indice),
    );
  }

  protected actualizarDescripcionFoto(indice: number, valor: string): void {
    this.fotosAdjuntas.update((actuales) =>
      actuales.map((foto, i) =>
        i === indice ? { ...foto, descripcion: valor } : foto,
      ),
    );
  }

  protected guardarSolicitud(): void {
    if (this.formulario.invalid || this.guardandoForm()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const raw = this.formulario.getRawValue();

    this.guardandoForm.set(true);
    this.errorForm.set('');
    this.mensajeExito.set('');

    const editId = this.editandoId();

    const fotos = this.fotosAdjuntas().map((f) => ({
      rutaImagen: f.rutaImagen,
      ...(f.descripcion?.trim()
        ? { descripcion: f.descripcion.trim() }
        : {}),
    }));

    if (!editId) {
      this.requestsService
        .crearSolicitud({
          idCategoria: Number(raw.idCategoria),
          idZona: Number(raw.idZona),
          ubicacionGeneral: raw.ubicacionGeneral.trim(),
          descripcion: raw.descripcion.trim(),
          ...(raw.fechaPreferida
            ? { fechaPreferida: raw.fechaPreferida }
            : {}),
          ...(fotos.length > 0 ? { fotografias: fotos } : {}),
        })
        .subscribe({
          next: (creada) => {
            this.guardandoForm.set(false);
            this.modalFormAbierto.set(false);

            this.mensajeExito.set(
              `Solicitud #${creada.referencia} publicada correctamente. Vigente por 30 días.`,
            );

            this.cargarSolicitudes();
            this.notificationsService.refrescarContador();
          },
          error: (err: unknown) => {
            this.guardandoForm.set(false);
            this.errorForm.set(
              mensajeDeError(err, 'No se pudo publicar la solicitud.'),
            );
          },
        });

      return;
    }

    this.requestsService
      .modificarSolicitud(editId, {
        idCategoria: Number(raw.idCategoria),
        idZona: Number(raw.idZona),
        ubicacionGeneral: raw.ubicacionGeneral.trim(),
        descripcion: raw.descripcion.trim(),
        fechaPreferida: raw.fechaPreferida
          ? raw.fechaPreferida
          : null,
        fotografias: fotos,
      })
      .subscribe({
        next: (actualizada) => {
          this.guardandoForm.set(false);
          this.modalFormAbierto.set(false);

          this.mensajeExito.set(
            `Solicitud #${actualizada.referencia} actualizada correctamente.`,
          );

          this.cargarSolicitudes();
          this.notificationsService.refrescarContador();
        },
        error: (err: unknown) => {
          this.guardandoForm.set(false);
          this.errorForm.set(
            mensajeDeError(err, 'No se pudo actualizar la solicitud.'),
          );
        },
      });
  }

  // Detalle de solicitud e historial
  protected abrirDetalle(solicitud: SolicitudServicioItem): void {
    this.cargandoDetalle.set(true);
    this.cotizaciones.set([]);
    this.errorCotizaciones.set('');
    this.visitas.set([]);
    this.errorVisitas.set('');
    this.historial.set({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        order: 'DESC',
        filtrosDisponibles: { tiposEvento: [], actores: [] },
      },
    });
    this.filtros.set({});

    this.requestsService.obtenerDetalle(solicitud.idSolicitud).subscribe({
      next: (detalle) => {
        this.detalleAbierto.set(detalle);
        this.cargandoDetalle.set(false);
        this.cargarCotizaciones(detalle.idSolicitud);
        this.cargarVisitas(detalle.idSolicitud);
        this.cargarHistorial(detalle.idSolicitud);
      },
      error: (err: unknown) => {
        this.cargandoDetalle.set(false);
        this.errorCarga.set(
          mensajeDeError(
            err,
            'No se pudo cargar el detalle de la solicitud.',
          ),
        );
      },
    });
  }

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(null);
    this.cotizaciones.set([]);
    this.errorCotizaciones.set('');
    this.visitas.set([]);
    this.errorVisitas.set('');
    this.historial.set({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        order: 'DESC',
        filtrosDisponibles: { tiposEvento: [], actores: [] },
      },
    });
    this.filtros.set({});
  }

  // Consultar cotizaciones recibidas
  protected cargarCotizaciones(idSolicitud: string): void {
    this.cargandoCotizaciones.set(true);
    this.errorCotizaciones.set('');

    this.quotationsService.listarPorSolicitud(idSolicitud).subscribe({
      next: (lista) => {
        this.cotizaciones.set(lista);
        this.cargandoCotizaciones.set(false);
      },
      error: (err: unknown) => {
        this.cargandoCotizaciones.set(false);
        this.errorCotizaciones.set(
          mensajeDeError(
            err,
            'No se pudieron cargar las cotizaciones.',
          ),
        );
      },
    });
  }

  // Aceptar o rechazar cotización
  protected cargarVisitas(idSolicitud: string): void {
    this.cargandoVisitas.set(true);
    this.errorVisitas.set('');
    this.visitsService.listarPorSolicitud(idSolicitud).subscribe({
      next: (lista) => { this.visitas.set(lista); this.cargandoVisitas.set(false); },
      error: (err: unknown) => { this.cargandoVisitas.set(false); this.errorVisitas.set(mensajeDeError(err, 'No se pudieron cargar las visitas previas.')); },
    });
  }

  protected solicitarVisita(): void {
    const detalle = this.detalleAbierto();
    if (!detalle || this.visitaForm.invalid || this.guardandoVisita()) { this.visitaForm.markAllAsTouched(); return; }
    const raw = this.visitaForm.getRawValue();
    this.guardandoVisita.set(true);
    this.errorVisitas.set('');
    this.visitsService.crear({ idSolicitud: detalle.idSolicitud, fechaPropuesta: raw.fechaPropuesta, horaPropuesta: raw.horaPropuesta, resultado: raw.resultado.trim() || undefined }).subscribe({
      next: () => {
        this.guardandoVisita.set(false);
        this.visitaForm.reset({ fechaPropuesta: '', horaPropuesta: '', resultado: '' });
        this.mensajeExito.set('Visita previa solicitada correctamente.');
        this.cargarVisitas(detalle.idSolicitud);
        this.notificationsService.refrescarContador();
      },
      error: (err: unknown) => { this.guardandoVisita.set(false); this.errorVisitas.set(mensajeDeError(err, 'No se pudo registrar la visita previa.')); },
    });
  }

  protected responderVisita(visita: VisitaPreviaItem, estado: 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'REALIZADA' | 'NO_REALIZADA'): void {
    if (this.guardandoVisita()) return;
    this.guardandoVisita.set(true);
    this.errorVisitas.set('');
    this.visitsService.responder(visita.idVisita, { estado }).subscribe({
      next: () => {
        this.guardandoVisita.set(false);
        const idSolicitud = this.detalleAbierto()?.idSolicitud;
        if (idSolicitud) this.cargarVisitas(idSolicitud);
        this.notificationsService.refrescarContador();
      },
      error: (err: unknown) => { this.guardandoVisita.set(false); this.errorVisitas.set(mensajeDeError(err, 'No se pudo actualizar la visita previa.')); },
    });
  }

  protected responderCotizacion(
    cotizacion: CotizacionItem,
    decision: DecisionCotizacion,
  ): void {
    if (
      this.cotizacionRespondiendo() ||
      cotizacion.estado !== 'ENVIADA'
    ) {
      return;
    }

    this.cotizacionRespondiendo.set(cotizacion.idCotizacion);
    this.errorCotizaciones.set('');

    this.quotationsService
      .responderCotizacion(cotizacion.idCotizacion, { decision })
      .subscribe({
        next: () => {
          this.cotizacionRespondiendo.set(null);

          const idSolicitud = this.detalleAbierto()?.idSolicitud;

          if (idSolicitud) {
            this.cargarCotizaciones(idSolicitud);
          }

          this.mensajeExito.set(
            decision === 'ACEPTADA'
              ? 'Cotización aceptada correctamente.'
              : 'Cotización rechazada correctamente.',
          );

          this.cargarSolicitudes();
          this.notificationsService.refrescarContador();
        },
        error: (err: unknown) => {
          this.cotizacionRespondiendo.set(null);
          this.errorCotizaciones.set(
            mensajeDeError(
              err,
              'No se pudo registrar tu decisión.',
            ),
          );
        },
      });
  }

  // Cancelar solicitud
  protected abrirCancelar(solicitud: SolicitudServicioItem): void {
    this.solicitudACancelar.set(solicitud);
    this.errorCancelar.set('');
    this.formCancelar.reset({ motivo: '' });
  }

  protected cerrarCancelar(): void {
    if (this.cancelando()) {
      return;
    }

    this.solicitudACancelar.set(null);
  }

  // Historial avanzado
  protected cargarHistorial(idSolicitud: string): void {
    this.cargandoHistorial.set(true);
    const params = this.filtros();

    this.requestsService.obtenerHistorial(idSolicitud, params).subscribe({
      next: (res) => {
        this.historial.set(res);
        this.cargandoHistorial.set(false);
      },
      error: (err: unknown) => {
        this.cargandoHistorial.set(false);
        console.error('Error cargando historial:', err);
        this.historial.set({
          data: [],
          meta: {
            total: 0,
            page: params.page ?? 1,
            limit: params.limit ?? 10,
            totalPages: 0,
            order: (params.order ?? 'DESC') as 'ASC' | 'DESC',
            filtrosDisponibles: { tiposEvento: [], actores: [] },
          },
        });
      },
    });
  }

  protected onFilterChange(
    clave: keyof HistoryQueryParams,
    evento: Event | string,
  ): void {
    let valor: unknown;

    if (typeof evento === 'string') {
      valor = evento;
    } else {
      const target = evento.target as HTMLSelectElement | HTMLInputElement;
      valor = target.value;
    }

    this.filtros.update((actuales) => {
      const nuevas: HistoryQueryParams = { ...actuales };

      switch (clave) {
        case 'tipoEvento':
        case 'estado':
        case 'actor':
        case 'fechaDesde':
        case 'fechaHasta':
          if (valor === '') {
            delete nuevas[clave];
          } else {
            nuevas[clave] = valor as string;
          }
          break;
        case 'order':
          nuevas.order = (valor as 'ASC' | 'DESC') ?? 'DESC';
          break;
        case 'page':
        case 'limit':
          nuevas[clave] = valor ? Number(valor) : undefined;
          break;
      }

      return nuevas;
    });

    const detalle = this.detalleAbierto();
    if (detalle) {
      this.cargarHistorial(detalle.idSolicitud);
    }
  }

  protected limpiarFiltros(): void {
    this.filtros.set({});
    const detalle = this.detalleAbierto();
    if (detalle) {
      this.cargarHistorial(detalle.idSolicitud);
    }
  }

  protected esFiltrosPorDefecto(): boolean {
    const f = this.filtros();
    return (
      !f.tipoEvento &&
      !f.estado &&
      !f.actor &&
      !f.fechaDesde &&
      !f.fechaHasta &&
      f.order === 'DESC' &&
      (f.page ?? 1) === 1 &&
      (f.limit ?? 10) === 10
    );
  }

  protected cambiarPagina(nuevaPage: number): void {
    if (nuevaPage <= 0) return;
    this.filtros.update((actuales) => ({
      ...actuales,
      page: nuevaPage,
    }));
    const detalle = this.detalleAbierto();
    if (detalle) {
      this.cargarHistorial(detalle.idSolicitud);
    }
  }

  protected confirmarCancelacion(): void {
    const objetivo = this.solicitudACancelar();

    if (!objetivo || this.cancelando()) {
      return;
    }

    this.cancelando.set(true);
    this.errorCancelar.set('');

    const motivo = this.formCancelar.getRawValue().motivo.trim();

    this.requestsService
      .cancelarSolicitud(objetivo.idSolicitud, motivo || undefined)
      .subscribe({
        next: (res) => {
          this.cancelando.set(false);
          this.solicitudACancelar.set(null);

          this.mensajeExito.set(
            `${res.mensaje} (#${res.solicitud.referencia}). Se registró en el historial.`,
          );

          this.cargarSolicitudes();
          this.notificationsService.refrescarContador();
        },
        error: (err: unknown) => {
          this.cancelando.set(false);
          this.errorCancelar.set(
            mensajeDeError(err, 'No se pudo cancelar la solicitud.'),
          );
        },
      });
  }

  // WhatsApp
  protected abrirWhatsapp(solicitud: SolicitudServicioItem): void {
    this.cargandoWhatsapp.set(true);
    this.errorWhatsapp.set('');

    this.requestsService
      .generarEnlaceWhatsapp(
        solicitud.idSolicitud,
        solicitud.programacion?.idPerfilTrabajador,
      )
      .subscribe({
        next: (res) => {
          this.cargandoWhatsapp.set(false);
          this.whatsappModal.set(res);
        },
        error: (err: unknown) => {
          this.cargandoWhatsapp.set(false);
          this.errorCarga.set(
            mensajeDeError(
              err,
              'No se pudo generar el enlace de contacto por WhatsApp.',
            ),
          );
        },
      });
  }

  protected cerrarWhatsapp(): void {
    this.whatsappModal.set(null);
  }

  // Etiquetas y estados
  protected etiquetaEstado(estado: string): string {
    const mapa: Record<string, string> = {
      ACTIVA: 'Activa',
      PRIORIDAD_REDUCIDA: 'Prioridad reducida (3+ días)',
      EN_COTIZACION: 'En cotización',
      PROGRAMADA: 'Programada',
      CONTRATADA: 'Contratada',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      VENCIDA: 'Vencida (30 días)',
    };

    return mapa[estado] ?? estado;
  }

  protected claseEstado(estado: string): string {
    switch (estado) {
      case 'ACTIVA':
      case 'EN_COTIZACION':
        return 'badge badge--activo';

      case 'PRIORIDAD_REDUCIDA':
        return 'badge badge--suspendido';

      case 'PROGRAMADA':
      case 'CONTRATADA':
      case 'COMPLETADA':
        return 'badge badge--cliente';

      case 'CANCELADA':
      case 'VENCIDA':
        return 'badge badge--inactivo';

      default:
        return 'badge badge--neutral';
    }
  }

  protected etiquetaEvento(tipo: string): string {
    const mapa: Record<string, string> = {
      SOLICITUD_PUBLICADA: 'Solicitud publicada',
      SOLICITUD_MODIFICADA: 'Solicitud modificada',
      SOLICITUD_CANCELADA: 'Solicitud cancelada',
      PRIORIDAD_REDUCIDA_3_DIAS:
        'Prioridad reducida (3 días sin respuesta)',
      SOLICITUD_VENCIDA: 'Solicitud vencida (30 días)',
    };

    return mapa[tipo] ?? tipo;
  }
}
