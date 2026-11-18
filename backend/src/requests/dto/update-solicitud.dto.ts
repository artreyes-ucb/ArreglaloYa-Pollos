import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSolicitudDto {
  @ApiPropertyOptional({
    description: 'Nuevo identificador de categoría de servicio',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La categoría debe ser un número entero válido' })
  @IsPositive({ message: 'La categoría debe ser un identificador positivo' })
  idCategoria?: number;

  @ApiPropertyOptional({
    description: 'Nuevo identificador de zona general',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La zona debe ser un número entero válido' })
  @IsPositive({ message: 'La zona debe ser un identificador positivo' })
  idZona?: number;

  @ApiPropertyOptional({
    description: 'Descripción actualizada del servicio requerido',
    example:
      'Se actualizó la descripción: además de la fuga en la cocina, necesito revisar un grifo del baño.',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MinLength(10, {
    message: 'Describe el trabajo requerido con al menos 10 caracteres',
  })
  @MaxLength(2000, {
    message: 'La descripción no puede superar los 2000 caracteres',
  })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Nueva referencia o ubicación general',
    example: 'Barrio Queru Queru, zona norte',
  })
  @IsOptional()
  @IsString({ message: 'La ubicación general debe ser texto' })
  @MinLength(3, {
    message: 'Indica una ubicación general de al menos 3 caracteres',
  })
  @MaxLength(200, {
    message: 'La ubicación general no puede superar los 200 caracteres',
  })
  ubicacionGeneral?: string;

  @ApiPropertyOptional({
    description:
      'Nueva fecha preferida en formato YYYY-MM-DD (enviar cadena vacía o null para quitarla)',
    example: '2026-11-24',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'La fecha preferida debe tener formato YYYY-MM-DD' })
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/, {
    message: 'La fecha preferida debe tener formato YYYY-MM-DD',
  })
  fechaPreferida?: string | null;

  @ApiPropertyOptional({
    description:
      'Lista completa actualizada de fotografías (si se envía, reemplaza las actuales; enviar [] las elimina)',
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
