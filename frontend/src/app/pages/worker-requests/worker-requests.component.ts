import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  CategoriaServicioItem,
  SolicitudServicioItem,
  WhatsappLinkResponse,
  ZonaItem,
} from '../../core/models/requests.models';
import { RequestsService } from '../../core/services/requests.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-worker-requests',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './worker-requests.component.html',
  styleUrl: './worker-requests.component.css',
})
export class WorkerRequestsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly requestsService = inject(RequestsService);

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

  protected readonly filtrosForm = this.fb.nonNullable.group({
    idCategoria: [0],
    idZona: [0],
    q: [''],
    soloMisCoincidencias: [false],
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
        // Silencioso si falla, se notificará en la búsqueda principal
      },
    });
  }

  protected buscar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.errorWhatsapp.set('');

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
          this.errorCarga.set(mensajeDeError(err, 'No se pudieron cargar las solicitudes.'));
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
  }

  protected cerrarDetalle(): void {
    this.detalleSolicitud.set(null);
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
    return estado === 'PRIORIDAD_REDUCIDA' ? 'badge badge--suspendido' : 'badge badge--activo';
  }
}
