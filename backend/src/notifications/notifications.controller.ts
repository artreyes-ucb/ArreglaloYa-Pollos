import {
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
import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar notificaciones internas del usuario autenticado (HU-F21)',
    description:
      'Devuelve el historial de avisos relevantes vinculados a solicitudes y servicios del usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones y contador de no leídas',
  })
  listarMisNotificaciones(
    @CurrentUser() usuario: Usuario,
    @Query() query: ListNotificacionesDto,
  ) {
    return this.notificationsService.listarMisNotificaciones(
      usuario.idUsuario,
      query.soloNoLeidas ?? false,
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
}
