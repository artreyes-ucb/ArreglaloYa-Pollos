import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServicioProgramado } from './servicio-programado.entity';
import { Usuario } from './usuario.entity';

@Entity('reclamos')
export class Reclamo {
  @PrimaryGeneratedColumn('uuid', { name: 'id_reclamo' })
  idReclamo: string;

  @Column({ name: 'id_programacion', type: 'uuid' })
  idProgramacion: string;

  @ManyToOne(() => ServicioProgramado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programacion' })
  programacion: ServicioProgramado;

  @Column({ name: 'id_cliente', type: 'uuid' })
  idCliente: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Usuario;

  @Column({ name: 'id_trabajador', type: 'uuid' })
  idTrabajador: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_trabajador' })
  trabajador: Usuario;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion: string;

  @Column({ name: 'evidencia_url', type: 'text', nullable: true })
  evidenciaUrl: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'ABIERTO' })
  estado: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO' | 'CERRADO';

  @Column({ name: 'resolucion', type: 'text', nullable: true })
  resolucion: string | null;

  @Column({ name: 'resuelto_por_admin_id', type: 'uuid', nullable: true })
  resueltoPorAdminId: string | null;

  @CreateDateColumn({ name: 'fecha_reclamo', type: 'timestamp' })
  fechaReclamo: Date;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date | null;
}