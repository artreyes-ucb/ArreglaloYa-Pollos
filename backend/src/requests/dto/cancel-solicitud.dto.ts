import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSolicitudDto {
  @ApiPropertyOptional({
    description: 'Motivo opcional de la cancelación de la solicitud',
    example: 'Ya resolví el inconveniente por cuenta propia.',
    maxLength: 300,
  })
  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(300, {
    message: 'El motivo de cancelación no puede superar los 300 caracteres',
  })
  motivo?: string;
}
