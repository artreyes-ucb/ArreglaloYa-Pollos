import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { normalizarCorreo } from '../../common/utils/transform.util';

export class ForgotPasswordDto {
  @Transform(({ value }) => normalizarCorreo(value))
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo: string;
}
