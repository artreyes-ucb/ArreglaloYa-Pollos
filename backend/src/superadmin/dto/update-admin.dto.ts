import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import {
  normalizarCorreo,
  normalizarTexto,
} from '../../common/utils/transform.util';

export class UpdateAdminDto {
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
  @Transform(({ value }) => normalizarCorreo(value))
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo?: string;

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

  @IsOptional()
  @IsArray({ message: 'Los roles deben enviarse como un arreglo' })
  @ArrayNotEmpty({ message: 'Debe asignar al menos un rol' })
  @ArrayUnique({ message: 'No se permiten roles duplicados' })
  @IsEnum(Rol, {
    each: true,
    message: 'Uno o más roles no son válidos',
  })
  roles?: Rol[];

  @IsOptional()
  @IsIn([EstadoUsuario.ACTIVO, EstadoUsuario.INACTIVO], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  estado?: EstadoUsuario;
}
