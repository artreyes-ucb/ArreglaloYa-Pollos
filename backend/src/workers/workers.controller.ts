import {
  Body,
  Controller,
  Get,
  Param,
Post,
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
import { ValidarPerfilTrabajadorDto } from './dto/validar-perfil-trabajador.dto';
import { GuardarDisponibilidadDto } from './dto/guardar-disponibilidad.dto';
import { ProgramarServicioDto } from './dto/programar-servicio.dto';
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
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  listarPerfilesPendientes() {
    return this.workersService.listarPerfilesPendientes();
  }

  @Get('admin/:idPerfil')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  obtenerPerfilParaRevision(
    @Param('idPerfil', new ParseUUIDPipe()) idPerfil: string,
  ) {
    return this.workersService.obtenerPerfilParaRevision(idPerfil);
  }

  @Patch('admin/:idPerfil/validation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  validarPerfil(
    @CurrentUser() usuario: Usuario,
    @Param('idPerfil', new ParseUUIDPipe()) idPerfil: string,
    @Body() dto: ValidarPerfilTrabajadorDto,
  ) {
    return this.workersService.validarPerfil(
      usuario.idUsuario,
      idPerfil,
      dto,
    );
  }

  @Post('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  guardarDisponibilidad(
    @CurrentUser() usuario: Usuario,
    @Body() dto: GuardarDisponibilidadDto,
  ) {
    return this.workersService.guardarDisponibilidad(
      usuario.idUsuario,
      dto,
    );
  }

  @Get('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiDisponibilidad(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiDisponibilidad(
      usuario.idUsuario,
    );
  }

  @Post('me/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  programarServicio(
    @CurrentUser() usuario: Usuario,
    @Body() dto: ProgramarServicioDto,
  ) {
    return this.workersService.programarServicio(
      usuario.idUsuario,
      dto,
    );
  }

  @Get('me/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiAgenda(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiAgenda(
      usuario.idUsuario,
    );
  }

}
