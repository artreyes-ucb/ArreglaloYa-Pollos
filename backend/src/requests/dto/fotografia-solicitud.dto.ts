import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FotografiaSolicitudDto {
  @ApiProperty({
    description:
      'Ruta relativa devuelta por /api/requests/upload-photo o URL válida de la fotografía',
    example: '/uploads/requests/ejemplo-fuga.jpg',
  })
  @IsString({ message: 'La ruta de la imagen debe ser texto' })
  @MinLength(5, { message: 'La ruta de la imagen es demasiado corta' })
  @MaxLength(2000, { message: 'La ruta de la imagen supera el límite permitido' })
  rutaImagen: string;

  @ApiPropertyOptional({
    description: 'Descripción opcional de la fotografía adjunta',
    example: 'Filtración debajo del lavamanos de la cocina',
  })
  @IsOptional()
  @IsString({ message: 'La descripción de la fotografía debe ser texto' })
  @MaxLength(200, {
    message: 'La descripción de la fotografía no puede superar 200 caracteres',
  })
  descripcion?: string;
}
