import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class SearchSolicitudesDto {
  @ApiPropertyOptional({
    description: 'Filtrar por identificador de categoría / especialidad',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'idCategoria debe ser un número entero' })
  @IsPositive({ message: 'idCategoria debe ser positivo' })
  idCategoria?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por identificador de zona de atención',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'idZona debe ser un número entero' })
  @IsPositive({ message: 'idZona debe ser positivo' })
  idZona?: number;

  @ApiPropertyOptional({
    description: 'Texto libre para buscar en descripción o ubicación general',
    example: 'tubería',
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser texto' })
  @MaxLength(120, {
    message: 'El término de búsqueda no puede superar 120 caracteres',
  })
  q?: string;

  @ApiPropertyOptional({
    description:
      'Si es true, limita los resultados únicamente a solicitudes que coincidan con las especialidades o zonas del trabajador autenticado',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'soloMisCoincidencias debe ser booleano' })
  soloMisCoincidencias?: boolean;
}
