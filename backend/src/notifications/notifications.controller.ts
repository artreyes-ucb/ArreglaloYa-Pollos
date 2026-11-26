import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Usuario } from '../entities/usuario.entity';
import { ListNotificacionesDto } from './dto/list-notificaciones.dto';
import { UpdatePreferenciasDto } from './dto/update-preferencias.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar notificaciones internas del usuario autenticado (HU-F21 y CU-25)',
    description:
      'Devuelve el historial de avisos con filtros opcionales por tipo, texto y estado de lectura.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones y contadores',
  })
  listarMisNotificaciones(
    @CurrentUser() usuario: Usuario,
    @Query() query: ListNotificacionesDto,
  ) {
    return this.notificationsService.listarMisNotificaciones(
      usuario.idUsuario,
      query,
    );
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Obtener configuración de preferencias de notificaciones del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actuales del usuario',
  })
  obtenerPreferencias(@CurrentUser() usuario: Usuario) {
    return this.notificationsService.obtenerPreferencias(usuario.idUsuario);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Actualizar configuración de preferencias de notificaciones del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas exitosamente',
  })
  actualizarPreferencias(
    @CurrentUser() usuario: Usuario,
    @Body() dto: UpdatePreferenciasDto,
  ) {
    return this.notificationsService.actualizarPreferencias(
      usuario.idUsuario,
      dto,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Consultar cantidad de notificaciones no leídas',
  })
  @ApiResponse({ status: 200, description: 'Cantidad actual de avisos sin leer' })
  contarNoLeidas(@CurrentUser() usuario: Usuario) {
    return this.notificationsService.contarNoLeidas(usuario.idUsuario);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Marcar todas las notificaciones pendientes como leídas',
  })
  @ApiResponse({ status: 200, description: 'Notificaciones actualizadas' })
  marcarTodasComoLeidas(@CurrentUser() usuario: Usuario) {
    return this.notificationsService.marcarTodasComoLeidas(usuario.idUsuario);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marcar una notificación específica como leída',
  })
  @ApiParam({ name: 'id', description: 'UUID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  marcarComoLeida(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.marcarComoLeida(usuario.idUsuario, id);
  }

  @Patch(':id/unread')
  @ApiOperation({
    summary: 'Marcar una notificación específica como no leída',
  })
  @ApiParam({ name: 'id', description: 'UUID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como no leída' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  marcarComoNoLeida(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.marcarComoNoLeida(usuario.idUsuario, id);
  }
}
