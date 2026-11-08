import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('registros_auditoria')
export class RegistroAuditoria {
  @PrimaryGeneratedColumn('uuid', { name: 'id_auditoria' })
  idAuditoria: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_actor' })
  usuarioActor: Usuario | null;

  @Column({ name: 'accion', type: 'varchar', length: 100 })
  accion: string;

  @Column({ name: 'entidad_afectada', type: 'varchar', length: 100 })
  entidadAfectada: string;

  @Column({
    name: 'id_entidad_afectada',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  idEntidadAfectada: string | null;

  @Column({ name: 'detalle', type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'fecha_evento', type: 'timestamp' })
  fechaEvento: Date;
}
