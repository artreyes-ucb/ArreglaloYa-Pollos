
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
import { RequestsService } from '../../core/services/requests.service';
import { QuotationsService } from '../../core/services/quotations.service';
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
