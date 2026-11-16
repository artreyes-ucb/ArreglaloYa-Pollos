import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PerfilTrabajador } from './perfil-trabajador.entity';
import { SolicitudServicio } from './solicitud-servicio.entity';

@Entity('servicios_programados')
export class ServicioProgramado {
  @PrimaryGeneratedColumn('uuid', { name: 'id_programacion' })
  idProgramacion: string;

  @ManyToOne(() => SolicitudServicio, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio;

  @ManyToOne(() => PerfilTrabajador, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_perfil' })
  perfil: PerfilTrabajador;

  @Column({ name: 'fecha_servicio', type: 'date' })
  fechaServicio: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'PROGRAMADO',
  })
  estado: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}
