import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListNotificacionesDto {
  @ApiPropertyOptional({
    description: 'Si es true, devuelve únicamente las notificaciones no leídas',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'soloNoLeidas debe ser un valor booleano' })
  soloNoLeidas?: boolean;
}
