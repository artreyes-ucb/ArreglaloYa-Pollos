jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificacionRepo: any;
  let preferenciaRepo: any;

  const mockUsuarioId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    notificacionRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Array.isArray(entity)
          ? Promise.resolve(entity)
          : Promise.resolve({ idNotificacion: 'notif-1', ...entity }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    preferenciaRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ idPreferencia: 'pref-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    service = new NotificationsService(notificacionRepo, preferenciaRepo);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerPreferencias', () => {
    it('debe crear preferencias por defecto si el usuario aún no tiene un registro', async () => {
      preferenciaRepo.findOne.mockResolvedValue(null);

      const res = await service.obtenerPreferencias(mockUsuarioId);

      expect(preferenciaRepo.findOne).toHaveBeenCalled();
      expect(preferenciaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notifSolicitudes: true,
          notifCotizaciones: true,
          notifServicios: true,
        }),
      );
      expect(res.notifSolicitudes).toBe(true);
    });

    it('debe retornar preferencias existentes si ya existen en base de datos', async () => {
      preferenciaRepo.findOne.mockResolvedValue({
        idPreferencia: 'pref-existente',
        notifSolicitudes: false,
        notifCotizaciones: true,
        notifServicios: false,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: false,
        fechaActualizacion: new Date(),
      });

      const res = await service.obtenerPreferencias(mockUsuarioId);
      expect(res.notifSolicitudes).toBe(false);
      expect(res.notifCotizaciones).toBe(true);
    });
  });

  describe('actualizarPreferencias', () => {
    it('debe actualizar los campos recibidos en el DTO', async () => {
      preferenciaRepo.findOne.mockResolvedValue({
        idPreferencia: 'pref-1',
        notifSolicitudes: true,
        notifCotizaciones: true,
        notifServicios: true,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: true,
      });

      const res = await service.actualizarPreferencias(mockUsuarioId, {
        notifCotizaciones: false,
        notifPagos: false,
      });

      expect(preferenciaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notifCotizaciones: false,
          notifPagos: false,
          notifSolicitudes: true,
        }),
      );
      expect(res.notifCotizaciones).toBe(false);
    });
  });

  describe('crearNotificacion con preferencias', () => {
    it('no debe guardar la notificación si el usuario desactivó esa categoría', async () => {
      preferenciaRepo.findOne.mockResolvedValue({
        notifSolicitudes: false,
        notifCotizaciones: true,
        notifServicios: true,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: true,
      });

      const res = await service.crearNotificacion({
        idUsuario: mockUsuarioId,
        tipo: 'SOLICITUD_PUBLICADA',
        titulo: 'Nueva solicitud',
        mensaje: 'Se ha publicado una solicitud',
      });

      expect(res).toBeNull();
      expect(notificacionRepo.save).not.toHaveBeenCalled();
    });

    it('debe guardar la notificación si la categoría está habilitada', async () => {
      preferenciaRepo.findOne.mockResolvedValue({
        notifSolicitudes: true,
        notifCotizaciones: true,
        notifServicios: true,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: true,
      });

      const res = await service.crearNotificacion({
        idUsuario: mockUsuarioId,
        tipo: 'SOLICITUD_PUBLICADA',
        titulo: 'Nueva solicitud',
        mensaje: 'Se ha publicado una solicitud',
      });

      expect(res).not.toBeNull();
      expect(notificacionRepo.save).toHaveBeenCalled();
    });
  });

  describe('marcarComoNoLeida', () => {
    it('debe marcar una notificación como no leída y limpiar fechaLectura', async () => {
      notificacionRepo.findOne.mockResolvedValue({
        idNotificacion: 'notif-1',
        leida: true,
        fechaLectura: new Date(),
        tipo: 'COTIZACION',
        titulo: 'Nueva cotización',
        mensaje: 'Has recibido una oferta',
        fechaEnvio: new Date(),
      });

      const res = await service.marcarComoNoLeida(mockUsuarioId, 'notif-1');

      expect(res.leida).toBe(false);
      expect(notificacionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          leida: false,
          fechaLectura: null,
        }),
      );
    });
  });

  describe('listarMisNotificaciones', () => {
    it('debe aplicar filtros y retornar notificaciones con contadores', async () => {
      const res = await service.listarMisNotificaciones(mockUsuarioId, {
        soloNoLeidas: true,
        tipo: 'COTIZACION',
        q: 'tubería',
      });

      expect(notificacionRepo.createQueryBuilder).toHaveBeenCalled();
      expect(res).toHaveProperty('notificaciones');
      expect(res).toHaveProperty('totalNoLeidas');
      expect(res).toHaveProperty('total');
    });
  });
});
