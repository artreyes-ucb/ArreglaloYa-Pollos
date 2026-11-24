export interface VisitaPreviaItem {
  idVisita: string;
  idSolicitud: string;
  estado: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  fechaConfirmada: string | null;
  horaConfirmada: string | null;
  resultado: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  solicitante: { idUsuario: string; nombres: string; apellidos: string } | null;
  respondedor: { idUsuario: string; nombres: string; apellidos: string } | null;
  trabajador: { idPerfil: string; nombres: string; apellidos: string } | null;
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
