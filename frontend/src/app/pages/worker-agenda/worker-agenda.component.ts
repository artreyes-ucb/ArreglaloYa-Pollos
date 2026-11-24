import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import { mensajeDeError } from '../../core/utils/http-error.util';
import {
  DisponibilidadTrabajador,
  ServicioProgramado,
  WorkersService,
} from '../../core/services/workers.service';

interface DiaEditable extends DisponibilidadTrabajador {
  nombre: string;
}

@Component({
  selector: 'app-worker-agenda',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './worker-agenda.component.html',
  styleUrl: './worker-agenda.component.css',
})
export class WorkerAgendaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workers = inject(WorkersService);

  protected readonly dias = signal<DiaEditable[]>([
    { diaSemana: 1, nombre: 'Lunes', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 2, nombre: 'Martes', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 3, nombre: 'Miércoles', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 4, nombre: 'Jueves', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 5, nombre: 'Viernes', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 6, nombre: 'Sábado', horaInicio: '09:00', horaFin: '17:00', disponible: false },
    { diaSemana: 7, nombre: 'Domingo', horaInicio: '09:00', horaFin: '17:00', disponible: false },
  ]);
  protected readonly agenda = signal<ServicioProgramado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly programando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected readonly hoy = new Date().toLocaleDateString('en-CA');

  protected readonly formulario = this.fb.nonNullable.group({
    idSolicitud: ['', [Validators.required, Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)]],
    fechaServicio: [this.hoy, Validators.required],
    horaInicio: ['09:00', Validators.required],
    horaFin: ['10:00', Validators.required],
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  protected actualizarDia(diaSemana: number, cambios: Partial<DiaEditable>): void {
    this.dias.update((dias) => dias.map((dia) => dia.diaSemana === diaSemana ? { ...dia, ...cambios } : dia));
  }

  protected guardarDisponibilidad(): void {
    const dias = this.dias();
    if (dias.some((dia) => dia.disponible && dia.horaInicio >= dia.horaFin)) {
      this.error.set('En cada día disponible, la hora de fin debe ser posterior a la hora de inicio.');
      this.exito.set('');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    forkJoin(dias.map(({ diaSemana, horaInicio, horaFin, disponible }) =>
      this.workers.guardarDisponibilidad({ diaSemana, horaInicio, horaFin, disponible }).pipe(timeout(15000)),
    ))
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set('Tu disponibilidad semanal se guardó correctamente.');
        },
        error: (error: unknown) => {
          this.error.set(mensajeDeError(error, 'No se pudo guardar toda la disponibilidad. Intenta nuevamente.'));
        },
      });
  }

  protected programar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valor = this.formulario.getRawValue();
    if (valor.horaInicio >= valor.horaFin) {
      this.error.set('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    this.programando.set(true);
    this.error.set('');
    this.exito.set('');
    this.workers.programarServicio(valor)
      .pipe(
        timeout(15000),
        finalize(() => this.programando.set(false)),
      )
      .subscribe({
        next: () => {
          this.exito.set('Servicio programado correctamente.');
          this.formulario.controls.idSolicitud.reset('');
          this.cargarAgenda();
        },
        error: (error: unknown) => {
          const name = (error as { name?: string })?.name;
          if (name === 'TimeoutError') {
            this.error.set('El servidor no respondió a tiempo al programar. Verifica el backend e intenta de nuevo.');
            return;
          }
          this.error.set(mensajeDeError(error, 'No se pudo programar el servicio.'));
        },
      });
  }

  private cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');
    this.workers.obtenerDisponibilidad()
      .pipe(timeout(15000))
      .subscribe({
        next: (registros) => {
          this.dias.update((dias) => dias.map((dia) => {
            const guardado = registros.find((item) => item.diaSemana === dia.diaSemana);
            return guardado ? { ...dia, horaInicio: guardado.horaInicio.slice(0, 5), horaFin: guardado.horaFin.slice(0, 5), disponible: guardado.disponible } : dia;
          }));
          this.cargarAgenda();
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          if ((error as { name?: string })?.name === 'TimeoutError') {
            this.error.set('El servidor no respondió a tiempo al cargar tu disponibilidad. Intenta nuevamente.');
            return;
          }
          this.error.set(mensajeDeError(error, 'No se pudo cargar tu disponibilidad.'));
        },
      });
  }

  private cargarAgenda(): void {
    this.workers.obtenerAgenda()
      .pipe(timeout(15000))
      .subscribe({
        next: (agenda) => { this.agenda.set(agenda); this.cargando.set(false); },
        error: (error: unknown) => {
          this.cargando.set(false);
          if ((error as { name?: string })?.name === 'TimeoutError') {
            this.error.set('El servidor no respondió a tiempo al cargar tu agenda. Intenta nuevamente.');
            return;
          }
          this.error.set(mensajeDeError(error, 'No se pudo cargar tu agenda.'));
        },
      });
  }
}
