import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pago } from './pago.entity';
import { ServicioProgramado } from './servicio-programado.entity';
import { Usuario } from './usuario.entity';

@Entity('reembolsos')
export class Reembolso {
  @PrimaryGeneratedColumn('uuid', { name: 'id_reembolso' })
  idReembolso: string;

  @Column({ name: 'id_programacion', type: 'uuid' })
  idProgramacion: string;

  @ManyToOne(() => ServicioProgramado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programacion' })
  programacion: ServicioProgramado;

  @Column({ name: 'id_pago', type: 'uuid' })
  idPago: string;

  @ManyToOne(() => Pago, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pago' })
  pago: Pago;

  @Column({ name: 'id_cliente', type: 'uuid' })
  idCliente: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Usuario;

  @Column({ name: 'monto_solicitado', type: 'numeric', precision: 10, scale: 2 })
  montoSolicitado: string;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'PENDIENTE' })
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO';

  @Column({ name: 'resuelto_por_admin_id', type: 'uuid', nullable: true })
  resueltoPorAdminId: string | null;

  @Column({ name: 'observacion_admin', type: 'text', nullable: true })
  observacionAdmin: string | null;

  @CreateDateColumn({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date | null;
}