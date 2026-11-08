import { HttpErrorResponse } from '@angular/common/http';

/**
 * Obtiene un mensaje legible a partir de la respuesta de error del backend.
 * NestJS puede devolver `message` como string o como arreglo de strings.
 */
export function mensajeDeError(error: unknown, mensajePorDefecto: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return mensajePorDefecto;
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.';
  }

  const detalle = error.error as { message?: unknown } | null;
  const mensaje = detalle?.message;

  if (Array.isArray(mensaje)) {
    return mensaje.join(' ');
  }

  if (typeof mensaje === 'string' && mensaje.trim().length > 0) {
    return mensaje;
  }

  return mensajePorDefecto;
}
