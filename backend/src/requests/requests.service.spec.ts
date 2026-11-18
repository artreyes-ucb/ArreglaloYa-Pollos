jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Rol } from '../common/enums/rol.enum';
import { Usuario } from '../entities/usuario.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ADVERTENCIA_WHATSAPP,
  ESTADO_SOLICITUD,
} from './requests.constants';
import { RequestsService } from './requests.service';

function crearUsuarioMock(parcial: Partial<Usuario>): Usuario {
  return {
    idUsuario: '11111111-1111-4111-8111-111111111111',
    nombres: 'Ana',
    apellidos: 'Pérez',
    correo: 'ana@example.com',
    telefono: '71234567',
    contrasenaHash: 'hash',
    roles: [Rol.CLIENTE],
    rolActivo: Rol.CLIENTE,
    estado: 'ACTIVO',
    resetToken: null,
    resetTokenExpira: null,
    fechaRegistro: new Date(),
    ...parcial,
  };
}

describe('RequestsService (Bloque 3)', () => {
  let service: RequestsService;
  let solicitudRepo: Record<string, jest.Mock>;
  let categoriaRepo: Record<string, jest.Mock>;
  let zonaRepo: Record<string, jest.Mock>;
  let perfilRepo: Record<string, jest.Mock>;
  let programacionRepo: Record<string, jest.Mock>;
  let historialRepo: Record<string, jest.Mock>;
  let auditService: { registrarEvento: jest.Mock };
  let notificationsService: {
    crearNotificacion: jest.Mock;
    crearNotificacionesMasivas: jest.Mock;
  };
  let dataSource: Partial<DataSource>;

  beforeEach(() => {
    solicitudRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };
    categoriaRepo = { find: jest.fn(), findOne: jest.fn() };
    zonaRepo = { find: jest.fn(), findOne: jest.fn() };
    perfilRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
    programacionRepo = { find: jest.fn(), findOne: jest.fn() };
    historialRepo = {
      find: jest.fn(),
      create: jest.fn((entity: unknown) => entity),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    };
    auditService = { registrarEvento: jest.fn().mockResolvedValue(undefined) };
    notificationsService = {
      crearNotificacion: jest.fn().mockResolvedValue({}),
      crearNotificacionesMasivas: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    service = new RequestsService(
      dataSource as DataSource,
      solicitudRepo as never,
      categoriaRepo as never,
      zonaRepo as never,
      perfilRepo as never,
      programacionRepo as never,
      historialRepo as never,
      auditService as unknown as AuditService,
      notificationsService as unknown as NotificationsService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('aplica RN-05: reduce prioridad tras 3 días sin respuesta y caduca a los 30 días', async () => {
    const ahora = Date.now();
    const hace4Dias = new Date(ahora - 4 * 24 * 60 * 60 * 1000);
    const en26Dias = new Date(ahora + 26 * 24 * 60 * 60 * 1000);
    const hace31Dias = new Date(ahora - 31 * 24 * 60 * 60 * 1000);
    const hace1Dia = new Date(ahora - 1 * 24 * 60 * 60 * 1000);

    const cliente = crearUsuarioMock({});

    const solicitud3Dias = {
      idSolicitud: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      estado: ESTADO_SOLICITUD.ACTIVA,
      fechaPublicacion: hace4Dias,
      fechaVencimiento: en26Dias,
      cliente,
      categoria: { idCategoria: 1, nombre: 'Plomería' },
    };

    const solicitud30Dias = {
      idSolicitud: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      estado: ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
      fechaPublicacion: hace31Dias,
      fechaVencimiento: hace1Dia,
      cliente,
      categoria: { idCategoria: 2, nombre: 'Electricidad' },
    };

    solicitudRepo.find.mockResolvedValue([solicitud3Dias, solicitud30Dias]);

    const resultado = await service.evaluarVigenciaSolicitudes(true);

    expect(resultado.evaluadas).toBe(2);
    expect(resultado.pasadasAPrioridadReducida).toBe(1);
    expect(resultado.pasadasAVencida).toBe(1);
    expect(solicitud3Dias.estado).toBe(ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA);
    expect(solicitud30Dias.estado).toBe(ESTADO_SOLICITUD.VENCIDA);
    expect(notificationsService.crearNotificacion).toHaveBeenCalledTimes(2);
    expect(auditService.registrarEvento).toHaveBeenCalledTimes(2);
  });

  it('impide cancelar una solicitud ajena (CU-14) devolviendo 403 Forbidden', async () => {
    solicitudRepo.find.mockResolvedValue([]);
    solicitudRepo.findOne.mockResolvedValue({
      idSolicitud: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      estado: ESTADO_SOLICITUD.ACTIVA,
      cliente: crearUsuarioMock({ idUsuario: 'otro-usuario-id' }),
    });

    const cliente = crearUsuarioMock({ idUsuario: 'mi-usuario-id' });

    await expect(
      service.cancelarSolicitud(
        cliente,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('impide cancelar por CU-14 si el servicio ya fue programado y remite a CU-17', async () => {
    const cliente = crearUsuarioMock({ idUsuario: 'mi-usuario-id' });
    solicitudRepo.find.mockResolvedValue([]);
    solicitudRepo.findOne.mockResolvedValue({
      idSolicitud: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      estado: ESTADO_SOLICITUD.PROGRAMADA,
      cliente,
    });

    await expect(
      service.cancelarSolicitud(
        cliente,
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        { motivo: 'Cambio de planes' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('bloquea enlace WhatsApp si el trabajador no está aprobado (CU-25 / RNF-09)', async () => {
    const trabajador = crearUsuarioMock({
      idUsuario: 'trabajador-1',
      rolActivo: Rol.TRABAJADOR,
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
    });

    solicitudRepo.find.mockResolvedValue([]);
    solicitudRepo.findOne.mockResolvedValue({
      idSolicitud: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      estado: ESTADO_SOLICITUD.ACTIVA,
      cliente: crearUsuarioMock({ idUsuario: 'cliente-1', telefono: '71234567' }),
      categoria: { idCategoria: 1, nombre: 'Plomería' },
      zona: { idZona: 1, nombre: 'Cercado - Norte' },
    });
    programacionRepo.findOne.mockResolvedValue(null);
    perfilRepo.findOne.mockResolvedValue({
      idPerfil: 'perfil-1',
      estadoValidacion: 'PENDIENTE',
    });

    await expect(
      service.generarEnlaceWhatsapp(
        trabajador,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('genera enlace dinámico a WhatsApp con prefijo 591 y advertencia de canal externo para trabajador aprobado', async () => {
    const trabajador = crearUsuarioMock({
      idUsuario: 'trabajador-1',
      rolActivo: Rol.TRABAJADOR,
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
    });

    solicitudRepo.find.mockResolvedValue([]);
    solicitudRepo.findOne.mockResolvedValue({
      idSolicitud: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      estado: ESTADO_SOLICITUD.ACTIVA,
      cliente: crearUsuarioMock({
        idUsuario: 'cliente-1',
        nombres: 'Carlos',
        apellidos: 'Gómez',
        telefono: '71234567',
      }),
      categoria: { idCategoria: 1, nombre: 'Plomería' },
      zona: { idZona: 1, nombre: 'Cercado - Norte' },
    });
    programacionRepo.findOne.mockResolvedValue(null);
    perfilRepo.findOne.mockResolvedValue({
      idPerfil: 'perfil-1',
      estadoValidacion: 'APROBADO',
    });

    const enlace = await service.generarEnlaceWhatsapp(
      trabajador,
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
    );

    expect(enlace.url).toContain('https://wa.me/59171234567?text=');
    expect(enlace.destinatarioNombre).toBe('Carlos G.');
    expect(enlace.advertencia).toBe(ADVERTENCIA_WHATSAPP);
    expect(enlace.canalExterno).toBe(true);
  });

  it('prioriza solicitudes ACTIVA y coincidencias de especialidad/zona en el buscador del trabajador (CU-13 / HU-F05)', async () => {
    const trabajador = crearUsuarioMock({
      idUsuario: 'trabajador-1',
      rolActivo: Rol.TRABAJADOR,
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
    });

    solicitudRepo.find.mockResolvedValue([]);
    perfilRepo.findOne.mockResolvedValue({
      idPerfil: 'perfil-1',
      estadoValidacion: 'APROBADO',
      servicios: [{ categoria: { idCategoria: 1, nombre: 'Plomería' } }],
      zonas: [{ idZona: 1, nombre: 'Cercado - Norte' }],
    });

    const ahora = new Date();
    const cliente = crearUsuarioMock({
      idUsuario: 'cliente-2',
      nombres: 'María',
      apellidos: 'López',
      correo: 'privado@correo.bo',
      telefono: '79998888',
    });

    const solPrioridadReducida = {
      idSolicitud: '11111111-aaaa-4aaa-8aaa-111111111111',
      estado: ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
      categoria: { idCategoria: 1, nombre: 'Plomería' },
      zona: { idZona: 1, nombre: 'Cercado - Norte' },
      descripcion: 'Fuga antigua',
      ubicacionGeneral: 'Cala Cala',
      fechaPreferida: null,
      fechaPublicacion: ahora,
      fechaVencimiento: new Date(ahora.getTime() + 25 * 86400000),
      cliente,
      fotografias: [],
    };

    const solActivaSinCoincidencia = {
      idSolicitud: '22222222-aaaa-4aaa-8aaa-222222222222',
      estado: ESTADO_SOLICITUD.ACTIVA,
      categoria: { idCategoria: 2, nombre: 'Electricidad' },
      zona: { idZona: 3, nombre: 'Cercado - Sur' },
      descripcion: 'Cambio de foco',
      ubicacionGeneral: 'Zona Sur',
      fechaPreferida: null,
      fechaPublicacion: ahora,
      fechaVencimiento: new Date(ahora.getTime() + 30 * 86400000),
      cliente,
      fotografias: [],
    };

    const solActivaCoincideTodo = {
      idSolicitud: '33333333-aaaa-4aaa-8aaa-333333333333',
      estado: ESTADO_SOLICITUD.ACTIVA,
      categoria: { idCategoria: 1, nombre: 'Plomería' },
      zona: { idZona: 1, nombre: 'Cercado - Norte' },
      descripcion: 'Tubería rota en baño',
      ubicacionGeneral: 'Cala Cala',
      fechaPreferida: null,
      fechaPublicacion: ahora,
      fechaVencimiento: new Date(ahora.getTime() + 30 * 86400000),
      cliente,
      fotografias: [],
    };

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([
          solPrioridadReducida,
          solActivaSinCoincidencia,
          solActivaCoincideTodo,
        ]),
    };
    solicitudRepo.createQueryBuilder.mockReturnValue(qb);

    const resultado = await service.buscarParaTrabajador(trabajador, {});

    expect(resultado.total).toBe(3);
    expect(resultado.solicitudes[0].idSolicitud).toBe(
      solActivaCoincideTodo.idSolicitud,
    );
    expect(resultado.solicitudes[0].coincideEspecialidad).toBe(true);
    expect(resultado.solicitudes[0].coincideZona).toBe(true);
    expect(resultado.solicitudes[1].idSolicitud).toBe(
      solActivaSinCoincidencia.idSolicitud,
    );
    expect(resultado.solicitudes[2].idSolicitud).toBe(
      solPrioridadReducida.idSolicitud,
    );

    const serializado = JSON.stringify(resultado);
    expect(serializado).not.toContain('privado@correo.bo');
    expect(serializado).not.toContain('79998888');
  });
});
