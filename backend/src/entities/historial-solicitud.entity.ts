import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudServicio } from './solicitud-servicio.entity';
import { Usuario } from './usuario.entity';

@Entity('historial_solicitud')
export class HistorialSolicitud {
  @PrimaryGeneratedColumn('uuid', { name: 'id_evento' })
  idEvento: string;

  @ManyToOne(() => SolicitudServicio, (solicitud) => solicitud.historial, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_actor' })
  usuarioActor: Usuario | null;

  @Column({ name: 'tipo_evento', type: 'varchar', length: 50 })
  tipoEvento: string;

  @Column({
    name: 'estado_anterior',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  estadoAnterior: string | null;

  @Column({
    name: 'estado_nuevo',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  estadoNuevo: string | null;

  @Column({ name: 'detalle', type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'fecha_evento', type: 'timestamp' })
  fechaEvento: Date;
}
