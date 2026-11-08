import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('perfiles_trabajador')
export class PerfilTrabajador {
  @PrimaryGeneratedColumn('uuid', { name: 'id_perfil' })
  idPerfil: string;

  @OneToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'anos_experiencia', type: 'int', default: 0 })
  anosExperiencia: number;

  @Column({
    name: 'documento_identidad',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  documentoIdentidad: string | null;

  @Column({
    name: 'datos_bancarios',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  datosBancarios: string | null;

  @Column({
    name: 'estado_validacion',
    type: 'varchar',
    length: 30,
    default: 'PENDIENTE',
  })
  estadoValidacion: string;

  @Column({
    name: 'fecha_validacion',
    type: 'timestamp',
    nullable: true,
  })
  fechaValidacion: Date | null;
}
