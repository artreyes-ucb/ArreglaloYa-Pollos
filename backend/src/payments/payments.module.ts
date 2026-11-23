import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Comision } from '../entities/comision.entity';
import { Evaluacion } from '../entities/evaluacion.entity';
import { Pago } from '../entities/pago.entity';
import { Reclamo } from '../entities/reclamo.entity';
import { Reembolso } from '../entities/reembolso.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicioProgramado,
      SolicitudServicio,
      Pago,
      Comision,
      Reembolso,
      Evaluacion,
      Reclamo,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}