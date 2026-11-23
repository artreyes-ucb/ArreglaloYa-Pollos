import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServicioProgramado } from './servicio-programado.entity';
import { SolicitudServicio } from './solicitud-servicio.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid', { name: 'id_pago' })
  idPago: string;

  @ManyToOne(() => SolicitudServicio, { nullable: true })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio | null;

  @Column({ name: 'id_programacion', type: 'uuid', nullable: true })
  idProgramacion: string | null;

  @ManyToOne(() => ServicioProgramado, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programacion' })
  programacion: ServicioProgramado | null;

  @Column({ name: 'tipo', type: 'varchar', length: 30 })
  tipo: string; // ANTICIPO_25 | PAGO_FINAL | REEMBOLSO

  @Column({ name: 'monto', type: 'numeric', precision: 10, scale: 2 })
  monto: string;

  @Column({
    name: 'comision_plataforma',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  comisionPlataforma: string;

  @Column({ name: 'monto_reportado_cliente', type: 'numeric', precision: 10, scale: 2, nullable: true })
  montoReportadoCliente: string | null;

  @Column({ name: 'confirmado_cliente', type: 'boolean', default: false })
  confirmadoCliente: boolean;

  @Column({ name: 'fecha_confirmacion_cliente', type: 'timestamp', nullable: true })
  fechaConfirmacionCliente: Date | null;

  @Column({ name: 'monto_reportado_trabajador', type: 'numeric', precision: 10, scale: 2, nullable: true })
  montoReportadoTrabajador: string | null;

  @Column({ name: 'confirmado_trabajador', type: 'boolean', default: false })
  confirmadoTrabajador: boolean;

  @Column({ name: 'fecha_confirmacion_trabajador', type: 'timestamp', nullable: true })
  fechaConfirmacionTrabajador: Date | null;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado: string; // PENDIENTE | CONCILIADO | DISCREPANTE | RECHAZADO

  @Column({ name: 'referencia', type: 'varchar', length: 150, nullable: true })
  referencia: string | null;

  @CreateDateColumn({ name: 'fecha_pago', type: 'timestamp' })
  fechaPago: Date;
}