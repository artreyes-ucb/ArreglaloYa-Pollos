export interface ReprogramacionVisitaItem {
  idReprogramacion: string;
  idVisita: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | string;
  rolSolicitante: 'CLIENTE' | 'TRABAJADOR' | string;
  fechaAnterior: string;
  horaInicioAnterior: string;
  horaFinAnterior: string | null;
  fechaPropuesta: string;
  horaInicioPropuesta: string;
  horaFinPropuesta: string;
  motivo: string;
  motivoRespuesta: string | null;
  fechaCreacion: string;
  fechaRespuesta: string | null;
  solicitante: { idUsuario: string; nombres: string; apellidos: string } | null;
  respondedor: { idUsuario: string; nombres: string; apellidos: string } | null;
}

export interface VisitaPreviaItem {
  idVisita: string;
  idSolicitud: string;
  estado: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  horaFinPropuesta?: string | null;
  fechaConfirmada: string | null;
  horaConfirmada: string | null;
  horaFinConfirmada?: string | null;
  resultado: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  solicitante: { idUsuario: string; nombres: string; apellidos: string } | null;
  respondedor: { idUsuario: string; nombres: string; apellidos: string } | null;
  trabajador: { idPerfil: string; nombres: string; apellidos: string } | null;
  reprogramaciones?: ReprogramacionVisitaItem[];
}

export interface CrearVisitaPreviaPayload {
  idSolicitud: string;
  idPerfil?: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  resultado?: string;
}

export interface ResponderVisitaPreviaPayload {
  estado: 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'REALIZADA' | 'NO_REALIZADA';
  fechaConfirmada?: string;
  horaConfirmada?: string;
  resultado?: string;
}

export interface SolicitarReprogramacionPayload {
  fechaPropuesta: string;
  horaInicioPropuesta: string;
  horaFinPropuesta: string;
  motivo: string;
}

export interface ResponderReprogramacionPayload {
  decision: 'ACEPTADA' | 'RECHAZADA';
  motivoRespuesta?: string;
}
