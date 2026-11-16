import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiPerfil(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiPerfil(usuario.idUsuario);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  actualizarMiPerfil(
    @CurrentUser() usuario: Usuario,
    @Body() dto: UpdatePerfilTrabajadorDto,
  ) {
    return this.workersService.actualizarMiPerfil(usuario.idUsuario, dto);
  }

  // Solo perfiles aprobados son visibles públicamente. No requiere autenticación.
  @Get(':idPerfil')
  obtenerPerfilPublico(@Param('idPerfil', new ParseUUIDPipe()) idPerfil: string) {
    return this.workersService.obtenerPerfilPublico(idPerfil);
  }
}
