
export type EstadoCotizacion = 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA';

export type DecisionCotizacion = 'ACEPTADA' | 'RECHAZADA';

export interface CrearCotizacionPayload {
  idSolicitud: string;
  precioManoObra: number;
  precioMateriales: number;
  alcance: string;
  condiciones?: string;
}

export interface ResponderCotizacionPayload {
  decision: DecisionCotizacion;
}

export interface TrabajadorCotizacion {
  idPerfil: string;
  nombres: string;
  apellidos: string;
  descripcion: string | null;
  anosExperiencia: number | null;
}

export interface CotizacionItem {
  idCotizacion: string;
  idSolicitud: string;
  precioManoObra: number;
  precioMateriales: number;
  precioTotal: number;
  alcance: string;
  condiciones: string | null;
  estado: EstadoCotizacion;
  fechaEnvio: string;
  fechaRespuesta: string | null;
  fechaVencimiento: string | null;
  trabajador?: TrabajadorCotizacion;
}
