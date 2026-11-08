import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizarCorreo } from '../../common/utils/transform.util';

export class ResetPasswordDto {
  @Transform(({ value }) => normalizarCorreo(value))
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo: string;

  @IsString({ message: 'El código es obligatorio' })
  @Matches(/^\d{6}$/, {
    message: 'El código debe tener exactamente 6 dígitos',
  })
  codigo: string;

  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(72, {
    message: 'La nueva contraseña no puede superar 72 caracteres',
  })
  nuevaContrasena: string;
}
