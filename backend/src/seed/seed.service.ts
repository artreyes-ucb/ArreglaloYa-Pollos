import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { Rol } from '../common/enums/rol.enum';
import { Usuario } from '../entities/usuario.entity';

const SEED_CORREO = 'superadmin@arreglaloya.bo';
const SEED_CONTRASENA = 'SuperAdmin2026!';
const SEED_TELEFONO = '70000000';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const superadminExistente = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where(':rol = ANY(usuario.roles)', { rol: Rol.SUPERADMIN })
      .getExists();

    if (superadminExistente) {
      this.logger.log('La cuenta semilla SUPERADMIN ya existe.');
      return;
    }

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 12));
    const contrasenaHash = await bcrypt.hash(SEED_CONTRASENA, rounds);

    const superadmin = this.usuarioRepository.create({
      nombres: 'Superadmin',
      apellidos: 'Arréglalo Ya',
      correo: SEED_CORREO,
      telefono: SEED_TELEFONO,
      contrasenaHash,
      roles: [Rol.SUPERADMIN, Rol.ADMIN, Rol.CLIENTE],
      rolActivo: Rol.SUPERADMIN,
      estado: EstadoUsuario.ACTIVO,
    });

    await this.usuarioRepository.save(superadmin);
    this.logger.log(`Cuenta semilla SUPERADMIN creada: ${SEED_CORREO}`);
  }
}
