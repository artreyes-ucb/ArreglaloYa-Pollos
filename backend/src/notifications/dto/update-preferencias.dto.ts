import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferenciasDto {
  @ApiPropertyOptional({
    description: 'Recibir notificaciones sobre solicitudes (publicación, modificación, cancelación, vigencia)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifSolicitudes debe ser un valor booleano' })
  notifSolicitudes?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones sobre cotizaciones recibidas o actualizadas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifCotizaciones debe ser un valor booleano' })
  notifCotizaciones?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones sobre servicios programados y visitas previas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifServicios debe ser un valor booleano' })
  notifServicios?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones sobre pagos, anticipos y reembolsos',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifPagos debe ser un valor booleano' })
  notifPagos?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones sobre reclamos y nuevas evaluaciones',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifReclamos debe ser un valor booleano' })
  notifReclamos?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones del sistema y avisos informativos generales',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'notifSistema debe ser un valor booleano' })
  notifSistema?: boolean;
}
