import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ListNotificacionesDto {
  @ApiPropertyOptional({
    description: 'Si es true, devuelve únicamente las notificaciones no leídas',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'soloNoLeidas debe ser un valor booleano' })
  soloNoLeidas?: boolean;

  @ApiPropertyOptional({
    description: 'Filtro explícito por estado de lectura: true (leídas) o false (no leídas)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : undefined))
  @IsBoolean({ message: 'leida debe ser un valor booleano' })
  leida?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de notificación específico (ej. SOLICITUD_PUBLICADA, COTIZACION, PROGRAMACION)',
    example: 'COTIZACION',
  })
  @IsOptional()
  @IsString({ message: 'tipo debe ser una cadena de texto' })
  tipo?: string;

  @ApiPropertyOptional({
    description: 'Texto de búsqueda para filtrar en el título o cuerpo del mensaje',
    example: 'tubería',
  })
  @IsOptional()
  @IsString({ message: 'q debe ser una cadena de texto' })
  q?: string;
}
