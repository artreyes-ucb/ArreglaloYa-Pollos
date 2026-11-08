import { EstadoUsuario } from '../enums/estado-usuario.enum';
import { Rol } from '../enums/rol.enum';
import { Usuario } from '../../entities/usuario.entity';

export interface UsuarioResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  roles: Rol[];
  rolActivo: Rol;
  estado: EstadoUsuario;
}

export function toUsuarioResponse(usuario: Usuario): UsuarioResponse {
  return {
    id: usuario.idUsuario,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    telefono: usuario.telefono,
    roles: usuario.roles,
    rolActivo: usuario.rolActivo,
    estado: usuario.estado,
  };
}
