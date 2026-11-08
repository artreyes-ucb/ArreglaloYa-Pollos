import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriaServicio } from './entities/categoria-servicio.entity';
import { Pago } from './entities/pago.entity';
import { PerfilTrabajador } from './entities/perfil-trabajador.entity';
import { RegistroAuditoria } from './entities/registro-auditoria.entity';
import { SolicitudServicio } from './entities/solicitud-servicio.entity';
import { Usuario } from './entities/usuario.entity';
import { Zona } from './entities/zona.entity';
import { SeedModule } from './seed/seed.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
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
          SolicitudServicio,
          Pago,
        ],
        autoLoadEntities: true,
        // El esquema se gobierna con Arreglalo_ya.sql; no dejar que TypeORM lo altere.
        synchronize: false,
        logging: false,
      }),
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    SuperadminModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
