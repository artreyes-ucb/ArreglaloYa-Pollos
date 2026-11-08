import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '../entities/usuario.entity';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generarToken(usuario: Usuario): Promise<string> {
    const payload: JwtPayload = {
      sub: usuario.idUsuario,
      correo: usuario.correo,
      roles: usuario.roles,
      rolActivo: usuario.rolActivo,
    };

    return this.jwtService.signAsync(payload);
  }
}
