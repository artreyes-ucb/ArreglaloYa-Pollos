import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoriaServicio } from './categoria-servicio.entity';
import { Usuario } from './usuario.entity';
import { Zona } from './zona.entity';

@Entity('solicitudes_servicio')
export class SolicitudServicio {
  @PrimaryGeneratedColumn('uuid', { name: 'id_solicitud' })
  idSolicitud: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Usuario;

  @ManyToOne(() => CategoriaServicio, { nullable: true })
  @JoinColumn({ name: 'id_categoria' })
  categoria: CategoriaServicio | null;

  @ManyToOne(() => Zona, { nullable: true })
  @JoinColumn({ name: 'id_zona' })
  zona: Zona | null;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion: string;

  @Column({
    name: 'ubicacion_general',
    type: 'varchar',
    length: 200,
  })
  ubicacionGeneral: string;

  @Column({ name: 'fecha_preferida', type: 'date', nullable: true })
  fechaPreferida: string | null;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'ACTIVA',
  })
  estado: string;

  @CreateDateColumn({ name: 'fecha_publicacion', type: 'timestamp' })
  fechaPublicacion: Date;

  @Column({
    name: 'fecha_vencimiento',
    type: 'timestamp',
    nullable: true,
  })
  fechaVencimiento: Date | null;
}
