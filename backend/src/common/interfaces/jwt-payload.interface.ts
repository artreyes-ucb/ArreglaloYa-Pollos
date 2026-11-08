import { Rol } from '../enums/rol.enum';

export interface JwtPayload {
  sub: string;
  correo: string;
  roles: Rol[];
  rolActivo: Rol;
  iat?: number;
  exp?: number;
}
