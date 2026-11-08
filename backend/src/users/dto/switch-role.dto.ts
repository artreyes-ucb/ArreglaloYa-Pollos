import { IsEnum } from 'class-validator';
import { Rol } from '../../common/enums/rol.enum';

export class SwitchRoleDto {
  @IsEnum(Rol, {
    message: 'El rol debe ser uno de los roles del sistema',
  })
  nuevoRol: Rol;
}
