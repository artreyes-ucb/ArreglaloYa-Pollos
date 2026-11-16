import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { ServicioTrabajador } from '../entities/servicio-trabajador.entity';
import { Zona } from '../entities/zona.entity';
import { WorkersController } from './workers.controller';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { WorkersService } from './workers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerfilTrabajador,
      ServicioTrabajador,
DisponibilidadTrabajador,
ServicioProgramado,
      CategoriaServicio,
      Zona,
    ]),
    AuditModule,
    AuthModule,
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
})
export class WorkersModule {}
