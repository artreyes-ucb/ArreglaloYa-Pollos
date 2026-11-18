import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MAX_FOTOGRAFIAS_SOLICITUD } from '../requests.constants';
import { FotografiaSolicitudDto } from './fotografia-solicitud.dto';

export class CreateSolicitudDto {
  @ApiProperty({
    description: 'Identificador de la categoría de servicio (especialidad)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'La categoría debe ser un número entero válido' })
  @IsPositive({ message: 'La categoría debe ser un identificador positivo' })
  idCategoria: number;

  @ApiProperty({
    description: 'Identificador de la zona general donde se requiere el servicio',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'La zona debe ser un número entero válido' })
  @IsPositive({ message: 'La zona debe ser un identificador positivo' })
  idZona: number;

  @ApiProperty({
    description: 'Descripción detallada del trabajo doméstico solicitado',
    example:
      'Necesito reparar una fuga constante en la tubería debajo del lavaplatos de la cocina y cambiar la llave angular.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString({ message: 'La descripción es obligatoria' })
  @MinLength(10, {
    message: 'Describe el trabajo requerido con al menos 10 caracteres',
  })
  @MaxLength(2000, {
    message: 'La descripción no puede superar los 2000 caracteres',
  })
  descripcion: string;

  @ApiProperty({
    description:
      'Referencia o ubicación general del servicio (sin exponer dirección exacta privada)',
    example: 'Barrio Cala Cala, cerca de la Av. América',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'La ubicación general es obligatoria' })
  @MinLength(3, {
    message: 'Indica una ubicación general de al menos 3 caracteres',
  })
  @MaxLength(200, {
    message: 'La ubicación general no puede superar los 200 caracteres',
  })
  ubicacionGeneral: string;

  @ApiPropertyOptional({
    description: 'Fecha preferida para la atención en formato YYYY-MM-DD',
    example: '2026-11-22',
  })
  @IsOptional()
  @IsString({ message: 'La fecha preferida debe tener formato YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha preferida debe tener formato YYYY-MM-DD',
  })
  fechaPreferida?: string;

  @ApiPropertyOptional({
    description: 'Fotografías opcionales de referencia (máximo 5)',
    type: [FotografiaSolicitudDto],
  })
  @IsOptional()
  @IsArray({ message: 'Las fotografías deben enviarse como una lista' })
  @ArrayMaxSize(MAX_FOTOGRAFIAS_SOLICITUD, {
    message: `Puedes adjuntar como máximo ${MAX_FOTOGRAFIAS_SOLICITUD} fotografías por solicitud`,
  })
  @ValidateNested({ each: true })
  @Type(() => FotografiaSolicitudDto)
  fotografias?: FotografiaSolicitudDto[];
}
