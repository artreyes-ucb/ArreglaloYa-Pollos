import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(RegistroAuditoria)
    private readonly registroAuditoriaRepository: Repository<RegistroAuditoria>,
  ) {}

  /**
   * Inserta un registro inmutable de auditoría. No existe operación de
   * actualización ni de borrado sobre esta tabla.
   */
  async registrarEvento(
    idUsuarioActor: string | null,
    accion: string,
    entidadAfectada: string,
    idEntidadAfectada: string | null,
    detalle: Record<string, unknown> | null = null,
  ): Promise<void> {
    const registro = this.registroAuditoriaRepository.create({
      usuarioActor: idUsuarioActor ? { idUsuario: idUsuarioActor } : null,
      accion,
      entidadAfectada,
      idEntidadAfectada,
      detalle,
    });

    await this.registroAuditoriaRepository.save(registro);
  }

  /**
   * Devuelve el historial de auditoría más reciente primero, incluyendo los
   * datos públicos del usuario actor.
   */
  async listarEventos(): Promise<RegistroAuditoria[]> {
    return this.registroAuditoriaRepository.find({
      relations: { usuarioActor: true },
      order: { fechaEvento: 'DESC' },
    });
  }
}
