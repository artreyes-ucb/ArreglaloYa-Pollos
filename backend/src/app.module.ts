import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { QuotationsModule } from './quotations/quotations.module';
import { RequestsModule } from './requests/requests.module';
import { SeedModule } from './seed/seed.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { UsersModule } from './users/users.module';
import { VisitsModule } from './visits/visits.module';
import { WorkersModule } from './workers/workers.module';

import { CategoriaServicio } from './entities/categoria-servicio.entity';
import { Comision } from './entities/comision.entity';
import { Cotizacion } from './entities/cotizacion.entity';
import { DisponibilidadTrabajador } from './entities/disponibilidad-trabajador.entity';
import { Evaluacion } from './entities/evaluacion.entity';
import { FotografiaSolicitud } from './entities/fotografia-solicitud.entity';
import { HistorialSolicitud } from './entities/historial-solicitud.entity';
import { IncrementoCotizacion } from './entities/incremento-cotizacion.entity';
import { Notificacion } from './entities/notificacion.entity';
import { Pago } from './entities/pago.entity';
import { PerfilTrabajador } from './entities/perfil-trabajador.entity';
import { Reclamo } from './entities/reclamo.entity';
import { Reembolso } from './entities/reembolso.entity';
import { RegistroAuditoria } from './entities/registro-auditoria.entity';
import { ServicioProgramado } from './entities/servicio-programado.entity';
import { ServicioTrabajador } from './entities/servicio-trabajador.entity';
import { SolicitudServicio } from './entities/solicitud-servicio.entity';
import { Usuario } from './entities/usuario.entity';
import { VisitaPrevia } from './entities/visita-previa.entity';
import { Zona } from './entities/zona.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'arreglalo_ya_db'),
        entities: [
          Usuario,
          RegistroAuditoria,
          CategoriaServicio,
          Zona,
          PerfilTrabajador,
          ServicioTrabajador,
          DisponibilidadTrabajador,
          ServicioProgramado,
          SolicitudServicio,
          FotografiaSolicitud,
          HistorialSolicitud,
          Notificacion,
          Pago,
          Cotizacion,
          IncrementoCotizacion,
          VisitaPrevia,
          Comision,
          Reembolso,
          Evaluacion,
          Reclamo,
        ],
        autoLoadEntities: true,
        // El esquema se gobierna con Arreglalo_ya.sql.
        // No permitir que TypeORM altere la base de datos.
        synchronize: false,
        logging: false,
      }),
    }),

    AuditModule,
    AuthModule,
    UsersModule,
    WorkersModule,
    NotificationsModule,
    RequestsModule,
    QuotationsModule,
    PaymentsModule,
    VisitsModule,
    SuperadminModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
