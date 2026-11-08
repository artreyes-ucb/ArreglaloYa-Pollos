import { IsIn } from 'class-validator';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';

export class UpdateAdminEstadoDto {
  @IsIn([EstadoUsuario.ACTIVO, EstadoUsuario.INACTIVO], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  estado: EstadoUsuario;
}
