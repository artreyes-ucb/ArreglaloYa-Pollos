import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { FotografiaSolicitud } from '../entities/fotografia-solicitud.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Zona } from '../entities/zona.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudServicio,
      FotografiaSolicitud,
      HistorialSolicitud,
      CategoriaServicio,
      Zona,
      PerfilTrabajador,
      ServicioProgramado,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
