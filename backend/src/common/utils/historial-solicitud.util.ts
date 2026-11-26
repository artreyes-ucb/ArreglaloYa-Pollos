import { DeepPartial } from 'typeorm';
import { HistorialSolicitud } from '../../entities/historial-solicitud.entity';
import { Usuario } from '../../entities/usuario.entity';
import { TipoEventoHistorial } from '../constants/historial-eventos';

export interface DatosEventoHistorial {
  idSolicitud: string;
  tipoEvento: TipoEventoHistorial;
  /** Usuario autenticado que ejecuta la acción. `null` para eventos automáticos. */
  actor?: Usuario | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  detalle?: Record<string, unknown> | null;
  /** Solo se usa cuando una acción automática no tiene actor humano. */
  automatico?: boolean;
}

/**
 * Construye la entidad de historial con la fotografía del actor.
 *
 * Guardar `actor_nombre` y `rol_actor` evita que un cambio posterior de nombre
 * o de rol activo altere la lectura histórica del evento. Los eventos
 * automáticos se marcan explícitamente y nunca se atribuyen a un usuario.
 */
export function construirEventoHistorial(
  datos: DatosEventoHistorial,
): DeepPartial<HistorialSolicitud> {
  const actor = datos.actor ?? null;
  const automatico = datos.automatico ?? actor === null;

  return {
    solicitud: { idSolicitud: datos.idSolicitud },
    usuarioActor: actor ? { idUsuario: actor.idUsuario } : null,
    tipoEvento: datos.tipoEvento,
    estadoAnterior: datos.estadoAnterior ?? null,
    estadoNuevo: datos.estadoNuevo ?? null,
    detalle: datos.detalle ?? null,
    actorNombre: actor ? `${actor.nombres} ${actor.apellidos}`.trim() : null,
    rolActor: actor?.rolActivo ?? null,
    automatico,
  };
}
