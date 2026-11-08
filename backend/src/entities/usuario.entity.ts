import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { Rol } from '../common/enums/rol.enum';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid', { name: 'id_usuario' })
  idUsuario: string;

  @Column({ name: 'nombres', type: 'varchar', length: 100 })
  nombres: string;

  @Column({ name: 'apellidos', type: 'varchar', length: 100 })
  apellidos: string;

  @Column({ name: 'correo', type: 'varchar', length: 150, unique: true })
  correo: string;

  @Column({ name: 'telefono', type: 'varchar', length: 30 })
  telefono: string;

  @Exclude()
  @Column({
    name: 'contrasena_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  contrasenaHash: string;

  @Column({
    name: 'roles',
    type: 'text',
    array: true,
    default: () => "ARRAY['CLIENTE']::text[]",
  })
  roles: Rol[];

  @Column({
    name: 'rol_activo',
    type: 'varchar',
    length: 30,
    default: Rol.CLIENTE,
  })
  rolActivo: Rol;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 20,
    default: EstadoUsuario.ACTIVO,
  })
  estado: EstadoUsuario;

  @Exclude()
  @Column({
    name: 'reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  resetToken: string | null;

  @Exclude()
  @Column({
    name: 'reset_token_expira',
    type: 'timestamp',
    nullable: true,
  })
  resetTokenExpira: Date | null;

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;
}
