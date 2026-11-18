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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Trabajadores')
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar perfil profesional propio del trabajador (CU-11)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiPerfil(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiPerfil(usuario.idUsuario);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil profesional, servicios y zonas del trabajador (CU-11)' })
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
  @ApiOperation({ summary: 'Consultar perfil público aprobado de un trabajador' })
  obtenerPerfilPublico(@Param('idPerfil', new ParseUUIDPipe()) idPerfil: string) {
    return this.workersService.obtenerPerfilPublico(idPerfil);
  }
  @Get('admin/pending')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar perfiles de trabajadores pendientes de verificación (CU-09)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  listarPerfilesPendientes() {
    return this.workersService.listarPerfilesPendientes();
  }

  @Get('admin/:idPerfil')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar detalle restringido de perfil para revisión administrativa (CU-09)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  obtenerPerfilParaRevision(
    @Param('idPerfil', new ParseUUIDPipe()) idPerfil: string,
  ) {
    return this.workersService.obtenerPerfilParaRevision(idPerfil);
  }

  @Patch('admin/:idPerfil/validation')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar o rechazar perfil de trabajador (CU-09)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Guardar disponibilidad semanal del trabajador (CU-16)' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar disponibilidad semanal del trabajador (CU-16)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiDisponibilidad(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiDisponibilidad(
      usuario.idUsuario,
    );
  }

  @Post('me/schedule')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Programar servicio en la agenda del trabajador (CU-05)' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar agenda de servicios programados del trabajador (CU-16)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  obtenerMiAgenda(@CurrentUser() usuario: Usuario) {
    return this.workersService.obtenerMiAgenda(
      usuario.idUsuario,
    );
  }

}
