export const ESTADO_SOLICITUD = {
  ACTIVA: 'ACTIVA',
  PRIORIDAD_REDUCIDA: 'PRIORIDAD_REDUCIDA',
  EN_COTIZACION: 'EN_COTIZACION',
  PROGRAMADA: 'PROGRAMADA',
  CONTRATADA: 'CONTRATADA',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
  VENCIDA: 'VENCIDA',
} as const;

export type EstadoSolicitud =
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD];

export const ESTADOS_DISPONIBLES_BUSQUEDA: string[] = [
  ESTADO_SOLICITUD.ACTIVA,
  ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
  ESTADO_SOLICITUD.EN_COTIZACION,
];

export const ESTADOS_MODIFICABLES_CLIENTE: string[] = [
  ESTADO_SOLICITUD.ACTIVA,
  ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
  ESTADO_SOLICITUD.EN_COTIZACION,
];

export const ESTADOS_CONTRATADOS_O_PROGRAMADOS: string[] = [
  ESTADO_SOLICITUD.PROGRAMADA,
  ESTADO_SOLICITUD.CONTRATADA,
];

export const DIAS_PERDIDA_PRIORIDAD = 3;
export const DIAS_CADUCIDAD_MAXIMA = 30;
export const MAX_FOTOGRAFIAS_SOLICITUD = 5;

export const ADVERTENCIA_WHATSAPP =
  'La comunicación mediante WhatsApp ocurre fuera de Arréglalo Ya. La plataforma no controla la disponibilidad del servicio externo ni garantiza el envío o lectura de mensajes. Recuerda registrar todos los acuerdos de precio, aprobaciones y pagos dentro de Arréglalo Ya.';
