import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class WhatsappLinkQueryDto {
  @ApiPropertyOptional({
    description:
      'UUID del perfil de trabajador a contactar (usado por el cliente cuando desea contactar a un trabajador específico si aún no hay servicio programado)',
    example: '11111111-2222-3333-4444-555555555555',
  })
  @IsOptional()
  @IsUUID('4', { message: 'idPerfilTrabajador debe ser un UUID válido' })
  idPerfilTrabajador?: string;
}
