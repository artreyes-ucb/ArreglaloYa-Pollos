export interface CategoriaServicioItem {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
}

export interface ZonaItem {
  idZona: number;
  nombre: string;
  descripcion: string | null;
}

export interface CatalogosSolicitudes {
  categorias: CategoriaServicioItem[];
  zonas: ZonaItem[];
}

export interface FotografiaSolicitudItem {
  idFotografia?: string;
  rutaImagen: string;
  descripcion: string | null;
  fechaSubida?: string;
}

export interface FotografiaSolicitudPayload {
  rutaImagen: string;
  descripcion?: string;
}

export interface UploadFotoResponse {
  rutaImagen: string;
  nombreOriginal: string;
  tamano: number;
  tipo: string;
}

export interface HistorialSolicitudItem {
  idEvento: string;
  tipoEvento: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  detalle: Record<string, unknown> | null;
  actorNombre: string | null;
  fechaEvento: string;
}

export interface ProgramacionResumenItem {
  idProgramacion: string;
  idPerfilTrabajador: string;
  trabajadorNombre: string;
  fechaServicio: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
}

export interface SolicitudServicioItem {
  idSolicitud: string;
  referencia: string;
  categoria: { idCategoria: number; nombre: string } | null;
  zona: { idZona: number; nombre: string } | null;
  descripcion: string;
  ubicacionGeneral: string;
  fechaPreferida: string | null;
  estado: string;
  fechaPublicacion: string;
  fechaVencimiento: string | null;
  diasTranscurridos: number;
  diasRestantes: number;
  prioridadReducida: boolean;
  puedeModificar: boolean;
  puedeCancelar: boolean;
  clienteNombrePublico: string;
  fotografias: FotografiaSolicitudItem[];
  coincideEspecialidad?: boolean;
  coincideZona?: boolean;
  puntajeRelevancia?: number;
  programacion?: ProgramacionResumenItem | null;
}

export interface SolicitudServicioDetalle extends SolicitudServicioItem {
  historial: HistorialSolicitudItem[];
}

export interface CreateSolicitudPayload {
  idCategoria: number;
  idZona: number;
  descripcion: string;
  ubicacionGeneral: string;
  fechaPreferida?: string;
  fotografias?: FotografiaSolicitudPayload[];
}

export interface UpdateSolicitudPayload {
  idCategoria?: number;
  idZona?: number;
  descripcion?: string;
  ubicacionGeneral?: string;
  fechaPreferida?: string | null;
  fotografias?: FotografiaSolicitudPayload[];
}

export interface SearchSolicitudesParams {
  idCategoria?: number | null;
  idZona?: number | null;
  q?: string;
  soloMisCoincidencias?: boolean;
}

export interface SearchSolicitudesResponse {
  perfilTrabajador: {
    estadoValidacion: string;
    categoriasIds: number[];
    zonasIds: number[];
  };
  total: number;
  solicitudes: SolicitudServicioItem[];
}

export interface WhatsappLinkResponse {
  url: string;
  destinatarioNombre: string;
  destinatarioRol: string;
  referenciaSolicitud: string;
  mensajePrellenado: string;
  advertencia: string;
  canalExterno: true;
}

export interface NotificacionItem {
  idNotificacion: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadRelacionada: string | null;
  idEntidadRelacionada: string | null;
  leida: boolean;
  fechaEnvio: string;
  fechaLectura: string | null;
}

export interface NotificacionesResponse {
  notificaciones: NotificacionItem[];
  totalNoLeidas: number;
  total?: number;
}

export interface PreferenciasNotificacion {
  idPreferencia: string;
  notifSolicitudes: boolean;
  notifCotizaciones: boolean;
  notifServicios: boolean;
  notifPagos: boolean;
  notifReclamos: boolean;
  notifSistema: boolean;
  fechaActualizacion: string;
}

export interface UpdatePreferenciasPayload {
  notifSolicitudes?: boolean;
  notifCotizaciones?: boolean;
  notifServicios?: boolean;
  notifPagos?: boolean;
  notifReclamos?: boolean;
  notifSistema?: boolean;
}

export interface FiltrosNotificacionesQuery {
  soloNoLeidas?: boolean;
  leida?: boolean;
  tipo?: string;
  q?: string;
}
