import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zonas')
export class Zona {
  @PrimaryGeneratedColumn('increment', { name: 'id_zona' })
  idZona: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;
}
