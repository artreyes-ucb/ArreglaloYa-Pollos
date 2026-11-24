import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudServicio } from './solicitud-servicio.entity';
import { PerfilTrabajador } from './perfil-trabajador.entity';
import { Usuario } from './usuario.entity';

@Entity('visitas_previas')
export class VisitaPrevia {
  @PrimaryGeneratedColumn('uuid', { name: 'id_visita' })
  idVisita: string;

  @ManyToOne(() => SolicitudServicio, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio;

  @ManyToOne(() => PerfilTrabajador, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_perfil' })
  perfil: PerfilTrabajador | null;

  @ManyToOne(() => Usuario, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_usuario_solicitante' })
  usuarioSolicitante: Usuario;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_usuario_respuesta' })
  usuarioRespuesta: Usuario | null;

  @Column({ name: 'fecha_propuesta', type: 'date' })
  fechaPropuesta: string;

  @Column({ name: 'hora_propuesta', type: 'time' })
  horaPropuesta: string;

  @Column({ name: 'fecha_confirmada', type: 'date', nullable: true })
  fechaConfirmada: string | null;

  @Column({ name: 'hora_confirmada', type: 'time', nullable: true })
  horaConfirmada: string | null;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'SOLICITADA',
  })
  estado: string;

  @Column({ name: 'resultado', type: 'text', nullable: true })
  resultado: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}