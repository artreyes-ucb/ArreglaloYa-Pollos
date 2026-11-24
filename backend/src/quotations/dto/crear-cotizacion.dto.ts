import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearCotizacionDto {
  @IsUUID()
  idSolicitud: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioManoObra: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioMateriales: number;

  @IsString()
  @MinLength(5)
  alcance: string;

  @IsOptional()
  @IsString()
  condiciones?: string;
}