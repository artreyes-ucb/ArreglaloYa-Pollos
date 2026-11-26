/**
 * Catálogo único de eventos del historial de solicitudes.
 *
 * Se centraliza aquí para que el DTO de filtros, la validación de la API y la
 * generación de descripciones usen exactamente los mismos valores permitidos.
 */
export const TIPO_EVENTO_HISTORIAL = {
  SOLICITUD_PUBLICADA: 'SOLICITUD_PUBLICADA',
  SOLICITUD_MODIFICADA: 'SOLICITUD_MODIFICADA',
  SOLICITUD_CANCELADA: 'SOLICITUD_CANCELADA',
  SOLICITUD_VENCIDA: 'SOLICITUD_VENCIDA',
  PRIORIDAD_REDUCIDA_3_DIAS: 'PRIORIDAD_REDUCIDA_3_DIAS',
  SOLICITUD_CONTRATADA: 'SOLICITUD_CONTRATADA',
  SOLICITUD_PROGRAMADA: 'SOLICITUD_PROGRAMADA',
  SERVICIO_EN_PROCESO: 'SERVICIO_EN_PROCESO',
  SERVICIO_COMPLETADO: 'SERVICIO_COMPLETADO',
  SERVICIO_CANCELADO: 'SERVICIO_CANCELADO',
  COTIZACION_ENVIADA: 'COTIZACION_ENVIADA',
  COTIZACION_ACEPTADA: 'COTIZACION_ACEPTADA',
  COTIZACION_RECHAZADA: 'COTIZACION_RECHAZADA',
  VISITA_PREVIA_SOLICITADA: 'VISITA_PREVIA_SOLICITADA',
  VISITA_PREVIA_ACEPTADA: 'VISITA_PREVIA_ACEPTADA',
  VISITA_PREVIA_RECHAZADA: 'VISITA_PREVIA_RECHAZADA',
  VISITA_PREVIA_CANCELADA: 'VISITA_PREVIA_CANCELADA',
  VISITA_PREVIA_REALIZADA: 'VISITA_PREVIA_REALIZADA',
  VISITA_PREVIA_NO_REALIZADA: 'VISITA_PREVIA_NO_REALIZADA',
} as const;

export type TipoEventoHistorial =
  (typeof TIPO_EVENTO_HISTORIAL)[keyof typeof TIPO_EVENTO_HISTORIAL];

export const TIPOS_EVENTO_HISTORIAL = Object.values(
  TIPO_EVENTO_HISTORIAL,
) as TipoEventoHistorial[];

const ETIQUETAS_EVENTO: Record<TipoEventoHistorial, string> = {
  SOLICITUD_PUBLICADA: 'Solicitud publicada',
  SOLICITUD_MODIFICADA: 'Solicitud modificada',
  SOLICITUD_CANCELADA: 'Solicitud cancelada',
  SOLICITUD_VENCIDA: 'Solicitud vencida',
  PRIORIDAD_REDUCIDA_3_DIAS: 'Prioridad reducida',
  SOLICITUD_CONTRATADA: 'Solicitud contratada',
  SOLICITUD_PROGRAMADA: 'Servicio programado',
  SERVICIO_EN_PROCESO: 'Servicio en proceso de cierre',
  SERVICIO_COMPLETADO: 'Servicio completado',
  SERVICIO_CANCELADO: 'Servicio contratado cancelado',
  COTIZACION_ENVIADA: 'Cotización enviada',
  COTIZACION_ACEPTADA: 'Cotización aceptada',
  COTIZACION_RECHAZADA: 'Cotización rechazada',
  VISITA_PREVIA_SOLICITADA: 'Visita previa solicitada',
  VISITA_PREVIA_ACEPTADA: 'Visita previa aceptada',
  VISITA_PREVIA_RECHAZADA: 'Visita previa rechazada',
  VISITA_PREVIA_CANCELADA: 'Visita previa cancelada',
  VISITA_PREVIA_REALIZADA: 'Visita previa realizada',
  VISITA_PREVIA_NO_REALIZADA: 'Visita previa no realizada',
};

export function etiquetaEventoHistorial(tipo: string): string {
  return (
    ETIQUETAS_EVENTO[tipo as TipoEventoHistorial] ??
    tipo.replace(/_/g, ' ').toLowerCase()
  );
}

function texto(
  detalle: Record<string, unknown> | null | undefined,
  clave: string,
): string | null {
  const valor = detalle?.[clave];
  if (typeof valor === 'string' && valor.trim()) {
    return valor.trim();
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return String(valor);
  }
  return null;
}

function dinero(
  detalle: Record<string, unknown> | null | undefined,
  clave: string,
): string | null {
  const valor = detalle?.[clave];
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor.toFixed(2);
  }
  if (typeof valor === 'string' && valor.trim()) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toFixed(2) : valor.trim();
  }
  return null;
}

/**
 * Genera una descripción legible en español a partir del tipo de evento y del
 * detalle JSONB persistido. No inventa información: solo usa lo que existe.
 */
export function describirEventoHistorial(
  tipo: string,
  detalle: Record<string, unknown> | null,
): string {
  switch (tipo) {
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_PUBLICADA: {
      const categoria = texto(detalle, 'categoria');
      const zona = texto(detalle, 'zona');
      const partes = [categoria ? `categoría ${categoria}` : null, zona ? `zona ${zona}` : null]
        .filter(Boolean)
        .join(' y ');
      return partes
        ? `La solicitud fue publicada para la ${partes}.`
        : 'La solicitud fue publicada y quedó activa.';
    }
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_MODIFICADA: {
      const campos = Array.isArray(detalle?.camposModificados)
        ? (detalle?.camposModificados as unknown[])
            .filter((campo): campo is string => typeof campo === 'string')
            .join(', ')
        : null;
      return campos
        ? `Se actualizaron los siguientes campos: ${campos}.`
        : 'Se actualizaron los datos de la solicitud.';
    }
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_CANCELADA: {
      const motivo = texto(detalle, 'motivo');
      return motivo
        ? `La solicitud fue cancelada por el cliente. Motivo: ${motivo}.`
        : 'La solicitud fue cancelada por el cliente.';
    }
    case TIPO_EVENTO_HISTORIAL.PRIORIDAD_REDUCIDA_3_DIAS: {
      const motivo = texto(detalle, 'motivo');
      return motivo
        ? `La solicitud perdió prioridad de forma automática: ${motivo}.`
        : 'La solicitud perdió prioridad de forma automática tras 3 días sin respuesta.';
    }
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_VENCIDA: {
      const motivo = texto(detalle, 'motivo');
      return motivo
        ? `La solicitud venció de forma automática: ${motivo}.`
        : 'La solicitud venció de forma automática al cumplir su plazo máximo de vigencia.';
    }
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_CONTRATADA: {
      const precio = dinero(detalle, 'precioTotal');
      const origen = texto(detalle, 'origen');
      if (precio) {
        return `La solicitud fue contratada por un precio de Bs. ${precio}.`;
      }
      if (origen === 'regularizacion_programacion') {
        return 'La solicitud fue regularizada a contratada al programar el servicio.';
      }
      return 'La solicitud fue contratada a partir de una cotización aceptada.';
    }
    case TIPO_EVENTO_HISTORIAL.SOLICITUD_PROGRAMADA: {
      const fecha = texto(detalle, 'fechaServicio');
      const inicio = texto(detalle, 'horaInicio');
      const fin = texto(detalle, 'horaFin');
      if (fecha && inicio && fin) {
        return `El servicio fue programado para el ${fecha} de ${inicio.slice(0, 5)} a ${fin.slice(0, 5)}.`;
      }
      return 'El servicio fue programado en la agenda del trabajador.';
    }
    case TIPO_EVENTO_HISTORIAL.SERVICIO_EN_PROCESO:
      return 'El trabajador declaró el servicio como terminado; queda pendiente la confirmación del cliente.';
    case TIPO_EVENTO_HISTORIAL.SERVICIO_COMPLETADO:
      return 'El cliente confirmó la conclusión del servicio y se completó el cierre dual.';
    case TIPO_EVENTO_HISTORIAL.SERVICIO_CANCELADO: {
      const motivo = texto(detalle, 'motivo');
      return motivo
        ? `El servicio contratado fue cancelado. Motivo: ${motivo}.`
        : 'El servicio contratado fue cancelado.';
    }
    case TIPO_EVENTO_HISTORIAL.COTIZACION_ENVIADA: {
      const precio = dinero(detalle, 'precioTotal');
      return precio
        ? `Un trabajador envió una cotización por Bs. ${precio}.`
        : 'Un trabajador envió una cotización para la solicitud.';
    }
    case TIPO_EVENTO_HISTORIAL.COTIZACION_ACEPTADA: {
      const precio = dinero(detalle, 'precioTotal');
      return precio
        ? `El cliente aceptó la cotización por Bs. ${precio}.`
        : 'El cliente aceptó una cotización.';
    }
    case TIPO_EVENTO_HISTORIAL.COTIZACION_RECHAZADA:
      return 'El cliente rechazó una cotización.';
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_SOLICITADA: {
      const fecha = texto(detalle, 'fechaPropuesta');
      const hora = texto(detalle, 'horaPropuesta');
      if (fecha && hora) {
        return `Se solicitó una visita previa para el ${fecha} a las ${hora.slice(0, 5)}.`;
      }
      return 'Se solicitó una visita previa para la solicitud.';
    }
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_ACEPTADA:
      return 'La visita previa fue aceptada.';
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_RECHAZADA:
      return 'La visita previa fue rechazada.';
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_CANCELADA:
      return 'La visita previa fue cancelada.';
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_REALIZADA:
      return 'La visita previa se realizó correctamente.';
    case TIPO_EVENTO_HISTORIAL.VISITA_PREVIA_NO_REALIZADA:
      return 'La visita previa no se pudo realizar.';
    default:
      return `Se registró el evento ${etiquetaEventoHistorial(tipo)}.`;
  }
}
