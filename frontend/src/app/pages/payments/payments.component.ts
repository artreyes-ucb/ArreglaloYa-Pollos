import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  PagoItem,
  ReclamoItem,
  ReembolsoItem,
  ServicioEconomicoItem,
} from '../../core/models/payments.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { PaymentsService } from '../../core/services/payments.service';
import { mensajeDeError } from '../../core/utils/http-error.util';

type ModalTipo =
  | null
  | 'anticipo'
  | 'pagoFinal'
  | 'confirmarPago'
  | 'cancelar'
  | 'reembolso'
  | 'evaluar'
  | 'reclamo'
  | 'resolverReclamo'
  | 'resolverReembolso';

@Component({
  selector: 'app-payments',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css',
})
export class PaymentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly notificationsService = inject(NotificationsService);

  protected readonly servicios = signal<ServicioEconomicoItem[]>([]);
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected readonly modalActivo = signal<ModalTipo>(null);
  protected readonly servicioSeleccionado = signal<ServicioEconomicoItem | null>(null);
  protected readonly pagoSeleccionado = signal<PagoItem | null>(null);
  protected readonly reclamoSeleccionado = signal<ReclamoItem | null>(null);
  protected readonly reembolsoSeleccionado = signal<ReembolsoItem | null>(null);

  protected readonly rolActivo = computed(() => this.auth.usuario()?.rolActivo ?? 'CLIENTE');
  protected readonly esAdmin = computed(
    () => this.rolActivo() === 'ADMIN' || this.rolActivo() === 'SUPERADMIN',
  );

  // Formularios
  protected readonly formAnticipo = this.fb.nonNullable.group({
    precioAcordado: [0, [Validators.required, Validators.min(1)]],
    referencia: [''],
  });

  protected readonly formPagoFinal = this.fb.nonNullable.group({
    monto: [0, [Validators.required, Validators.min(0.01)]],
    referencia: [''],
  });

  protected readonly formConfirmarPago = this.fb.nonNullable.group({
    montoReportado: [0, [Validators.required, Validators.min(0.01)]],
    referencia: [''],
  });

  protected readonly formMotivo = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  protected readonly formEvaluar = this.fb.nonNullable.group({
    puntuacion: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comentario: ['', [Validators.maxLength(1000)]],
  });

  protected readonly formReclamo = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    evidenciaUrl: ['', [Validators.maxLength(500)]],
  });

  protected readonly formResolverReclamo = this.fb.nonNullable.group({
    estado: ['RESUELTO' as 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO' | 'CERRADO', Validators.required],
    resolucion: ['', [Validators.required, Validators.minLength(5)]],
  });

  protected readonly formResolverReembolso = this.fb.nonNullable.group({
    estado: ['APROBADO' as 'APROBADO' | 'RECHAZADO' | 'COMPLETADO', Validators.required],
    observacionAdmin: [''],
  });

  ngOnInit(): void {
    this.cargarServicios();
  }

  protected cargarServicios(): void {
    this.cargando.set(true);
    this.error.set('');
    this.paymentsService.listarMisServicios().subscribe({
      next: (lista) => {
        this.servicios.set(lista);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar los servicios contratados.'));
      },
    });
  }

  protected abrirModal(tipo: ModalTipo, sp: ServicioEconomicoItem, pago?: PagoItem): void {
    this.error.set('');
    this.mensaje.set('');
    this.servicioSeleccionado.set(sp);
    this.pagoSeleccionado.set(pago ?? null);
    this.modalActivo.set(tipo);

    if (tipo === 'anticipo') {
      this.formAnticipo.reset({ precioAcordado: sp.precioAcordado || 100, referencia: '' });
    } else if (tipo === 'pagoFinal') {
      const saldo = Number((sp.precioAcordado * 0.75).toFixed(2));
      this.formPagoFinal.reset({ monto: saldo > 0 ? saldo : sp.precioAcordado, referencia: '' });
    } else if (tipo === 'confirmarPago' && pago) {
      this.formConfirmarPago.reset({ montoReportado: Number(pago.monto), referencia: pago.referencia ?? '' });
    } else if (tipo === 'cancelar' || tipo === 'reembolso') {
      this.formMotivo.reset({ motivo: '' });
    } else if (tipo === 'evaluar') {
      this.formEvaluar.reset({ puntuacion: 5, comentario: '' });
    } else if (tipo === 'reclamo') {
      this.formReclamo.reset({ descripcion: '', evidenciaUrl: '' });
    }
  }

  protected abrirResolverReclamo(reclamo: ReclamoItem): void {
    this.reclamoSeleccionado.set(reclamo);
    this.formResolverReclamo.reset({ estado: 'RESUELTO', resolucion: reclamo.resolucion ?? '' });
    this.modalActivo.set('resolverReclamo');
  }

  protected abrirResolverReembolso(reembolso: ReembolsoItem): void {
    this.reembolsoSeleccionado.set(reembolso);
    this.formResolverReembolso.reset({ estado: 'APROBADO', observacionAdmin: '' });
    this.modalActivo.set('resolverReembolso');
  }

  protected cerrarModal(): void {
    if (this.procesando()) return;
    this.modalActivo.set(null);
  }

  protected enviarAnticipo(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formAnticipo.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.registrarAnticipo(sp.idProgramacion, this.formAnticipo.getRawValue()),
      'Anticipo del 25% registrado. Queda pendiente la confirmación del trabajador.',
    );
  }

  protected enviarPagoFinal(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formPagoFinal.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.registrarPagoFinal(sp.idProgramacion, this.formPagoFinal.getRawValue()),
      'Pago final registrado. Queda pendiente la confirmación bilateral.',
    );
  }

  protected enviarConfirmacionPago(): void {
    const pago = this.pagoSeleccionado();
    if (!pago || this.formConfirmarPago.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.confirmarPagoBilateral(pago.idPago, this.formConfirmarPago.getRawValue()),
      'Confirmación de pago registrada correctamente.',
    );
  }

  protected marcarTerminado(sp: ServicioEconomicoItem): void {
    this.ejecutarAccion(
      this.paymentsService.marcarTerminadoTrabajador(sp.idProgramacion),
      'Servicio marcado como terminado. Se notificó al cliente para su confirmación.',
    );
  }

  protected confirmarConclusion(sp: ServicioEconomicoItem): void {
    this.ejecutarAccion(
      this.paymentsService.confirmarConclusionCliente(sp.idProgramacion),
      'Conclusión confirmada. El servicio pasó a COMPLETADO y se calculó la comisión del 5%.',
    );
  }

  protected enviarCancelacion(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formMotivo.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.cancelarServicio(sp.idProgramacion, this.formMotivo.getRawValue().motivo),
      'Servicio contratado cancelado correctamente.',
    );
  }

  protected enviarReembolso(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formMotivo.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.solicitarReembolso(sp.idProgramacion, this.formMotivo.getRawValue().motivo),
      'Solicitud de reembolso enviada para revisión administrativa.',
    );
  }

  protected enviarEvaluacion(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formEvaluar.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.crearEvaluacion(sp.idProgramacion, this.formEvaluar.getRawValue()),
      '¡Gracias! Tu calificación fue registrada.',
    );
  }

  protected enviarReclamo(): void {
    const sp = this.servicioSeleccionado();
    if (!sp || this.formReclamo.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.crearReclamo(sp.idProgramacion, this.formReclamo.getRawValue()),
      'Reclamo registrado dentro del plazo de 7 días para revisión administrativa.',
    );
  }

  protected enviarResolucionReclamo(): void {
    const rec = this.reclamoSeleccionado();
    if (!rec || this.formResolverReclamo.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.resolverReclamo(rec.idReclamo, this.formResolverReclamo.getRawValue()),
      'Resolución del reclamo guardada en auditoría.',
    );
  }

  protected enviarResolucionReembolso(): void {
    const reemb = this.reembolsoSeleccionado();
    if (!reemb || this.formResolverReembolso.invalid) return;
    this.ejecutarAccion(
      this.paymentsService.resolverReembolso(
        reemb.idReembolso,
        this.formResolverReembolso.getRawValue(),
      ),
      'Resolución del reembolso registrada correctamente.',
    );
  }

  protected tieneTipoPago(sp: ServicioEconomicoItem, tipo: string): boolean {
    return sp.pagos.some((p) => p.tipo === tipo);
  }

  private ejecutarAccion(obs$: { subscribe: Function }, exitoMsg: string): void {
    this.procesando.set(true);
    this.error.set('');
    obs$.subscribe({
      next: () => {
        this.procesando.set(false);
        this.modalActivo.set(null);
        this.mensaje.set(exitoMsg);
        this.cargarServicios();
        this.notificationsService.refrescarContador();
      },
      error: (err: unknown) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo completar la operación.'));
      },
    });
  }
}