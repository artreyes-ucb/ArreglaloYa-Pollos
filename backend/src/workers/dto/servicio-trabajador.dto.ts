import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ServicioTrabajadorDto {
  @IsInt({ message: 'La categoría debe ser un identificador entero' })
  @Min(1, { message: 'La categoría seleccionada no es válida' })
  idCategoria: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El nombre del servicio debe ser texto' })
  @MinLength(2, { message: 'El nombre del servicio es demasiado corto' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombreServicio: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(2000, { message: 'La descripción no puede superar 2000 caracteres' })
  descripcion?: string;

  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio estimado debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'El precio estimado no puede ser negativo' })
  @Max(99999999.99, { message: 'El precio estimado supera el máximo permitido' })
  precioEstimado: number;
}
