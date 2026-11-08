import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { normalizarTexto } from '../../common/utils/transform.util';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'Los nombres deben ser texto' })
  @IsNotEmpty({ message: 'Los nombres no pueden estar vacíos' })
  @MaxLength(100, { message: 'Los nombres no pueden superar 100 caracteres' })
  nombres?: string;

  @IsOptional()
  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'Los apellidos deben ser texto' })
  @IsNotEmpty({ message: 'Los apellidos no pueden estar vacíos' })
  @MaxLength(100, {
    message: 'Los apellidos no pueden superar 100 caracteres',
  })
  apellidos?: string;

  @IsOptional()
  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono no puede estar vacío' })
  @MaxLength(30, { message: 'El teléfono no puede superar 30 caracteres' })
  @Matches(/^[0-9+\-\s()]{7,30}$/, {
    message:
      'El teléfono debe contener entre 7 y 30 dígitos o caracteres válidos',
  })
  telefono?: string;
}
