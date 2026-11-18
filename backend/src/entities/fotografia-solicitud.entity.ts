import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudServicio } from './solicitud-servicio.entity';

@Entity('fotografias_solicitud')
export class FotografiaSolicitud {
  @PrimaryGeneratedColumn('uuid', { name: 'id_fotografia' })
  idFotografia: string;

  @ManyToOne(() => SolicitudServicio, (solicitud) => solicitud.fotografias, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio;

  @Column({ name: 'ruta_imagen', type: 'text' })
  rutaImagen: string;

  @Column({
    name: 'descripcion',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  descripcion: string | null;

  @CreateDateColumn({ name: 'fecha_subida', type: 'timestamp' })
  fechaSubida: Date;
}
