import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizarCorreo,
  normalizarTexto,
} from '../../common/utils/transform.util';

export class RegisterDto {
  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'Los nombres son obligatorios' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @MaxLength(100, { message: 'Los nombres no pueden superar 100 caracteres' })
  nombres: string;

  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'Los apellidos son obligatorios' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @MaxLength(100, {
    message: 'Los apellidos no pueden superar 100 caracteres',
  })
  apellidos: string;

  @Transform(({ value }) => normalizarCorreo(value))
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo: string;

  @Transform(({ value }) => normalizarTexto(value))
  @IsString({ message: 'El teléfono es obligatorio' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(30, { message: 'El teléfono no puede superar 30 caracteres' })
  @Matches(/^[0-9+\-\s()]{7,30}$/, {
    message:
      'El teléfono debe contener entre 7 y 30 dígitos o caracteres válidos',
  })
  telefono: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  contrasena: string;

  @IsOptional()
  @IsBoolean({ message: 'registrarseComoTrabajador debe ser booleano' })
  registrarseComoTrabajador?: boolean;
}
