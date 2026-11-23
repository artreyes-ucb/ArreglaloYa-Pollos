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

  @Column({ name: 'precio_acordado', type: 'numeric', precision: 10, scale: 2, default: 0 })
  precioAcordado: string;

  @Column({ name: 'marcado_terminado_por_trabajador', type: 'boolean', default: false })
  marcadoTerminadoPorTrabajador: boolean;

  @Column({ name: 'fecha_declaracion_trabajador', type: 'timestamp', nullable: true })
  fechaDeclaracionTrabajador: Date | null;

  @Column({ name: 'confirmado_por_cliente', type: 'boolean', default: false })
  confirmadoPorCliente: boolean;

  @Column({ name: 'fecha_confirmacion_cliente', type: 'timestamp', nullable: true })
  fechaConfirmacionCliente: Date | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @Column({ name: 'cancelado_por_usuario_id', type: 'uuid', nullable: true })
  canceladoPorUsuarioId: string | null;

  @Column({ name: 'fecha_cancelacion', type: 'timestamp', nullable: true })
  fechaCancelacion: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}