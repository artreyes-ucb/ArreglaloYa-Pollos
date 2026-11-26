import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TIPOS_EVENTO_HISTORIAL } from '../../common/constants/historial-eventos';
import { ESTADO_SOLICITUD } from '../requests.constants';

export const ORDEN_HISTORIAL = ['ASC', 'DESC'] as const;
export type OrdenHistorial = (typeof ORDEN_HISTORIAL)[number];

const ESTADOS_SOLICITUD_VALIDOS: string[] = Object.values(ESTADO_SOLICITUD);

function normalizarMayusculas(valor: unknown): unknown {
  return typeof valor === 'string' ? valor.trim().toUpperCase() : valor;
}

/**
 * Filtros del historial avanzado.
 *
 * Todos los valores se validan en el backend con class-validator; el frontend
 * no es una fuente de confianza. Los parámetros son opcionales y se combinan
 * con AND en la consulta SQL generada por TypeORM.
 */
export class HistoryQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizarMayusculas(value))
  @IsIn(TIPOS_EVENTO_HISTORIAL, {
    message: `tipoEvento debe ser uno de: ${TIPOS_EVENTO_HISTORIAL.join(', ')}`,
  })
  tipoEvento?: string;

  @IsOptional()
  @Transform(({ value }) => normalizarMayusculas(value))
  @IsIn(ESTADOS_SOLICITUD_VALIDOS, {
    message: `estado debe ser uno de: ${ESTADOS_SOLICITUD_VALIDOS.join(', ')}`,
  })
  estado?: string;

  /** UUID del usuario responsable del evento. */
  @IsOptional()
  @IsUUID('all', { message: 'actor debe ser un UUID válido' })
  actor?: string;

  /** Fecha inicial en formato YYYY-MM-DD o ISO 8601. */
  @IsOptional()
  @IsDateString({}, { message: 'fechaDesde debe ser una fecha válida' })
  fechaDesde?: string;

  /** Fecha final en formato YYYY-MM-DD o ISO 8601. */
  @IsOptional()
  @IsDateString({}, { message: 'fechaHasta debe ser una fecha válida' })
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede ser mayor a 100' })
  limit: number = 10;

  @IsOptional()
  @Transform(({ value }) => normalizarMayusculas(value))
  @IsIn(ORDEN_HISTORIAL, {
    message: 'order debe ser ASC o DESC',
  })
  order: OrdenHistorial = 'DESC';
}
