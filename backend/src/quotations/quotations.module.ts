import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cotizacion } from '../entities/cotizacion.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';

import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cotizacion,
      SolicitudServicio,
      PerfilTrabajador,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}