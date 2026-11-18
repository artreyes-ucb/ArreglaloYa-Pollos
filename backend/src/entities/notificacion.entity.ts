import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_notificacion' })
  idNotificacion: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'tipo', type: 'varchar', length: 50 })
  tipo: string;

  @Column({ name: 'titulo', type: 'varchar', length: 150 })
  titulo: string;

  @Column({ name: 'mensaje', type: 'text' })
  mensaje: string;

  @Column({
    name: 'entidad_relacionada',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  entidadRelacionada: string | null;

  @Column({
    name: 'id_entidad_relacionada',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  idEntidadRelacionada: string | null;

  @Column({ name: 'leida', type: 'boolean', default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'fecha_envio', type: 'timestamp' })
  fechaEnvio: Date;

  @Column({ name: 'fecha_lectura', type: 'timestamp', nullable: true })
  fechaLectura: Date | null;
}
