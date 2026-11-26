import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { ReprogramacionVisita } from '../entities/reprogramacion-visita.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaPrevia,
      SolicitudServicio,
      PerfilTrabajador,
      HistorialSolicitud,
      Cotizacion,
      ReprogramacionVisita,
      DisponibilidadTrabajador,
      ServicioProgramado,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
