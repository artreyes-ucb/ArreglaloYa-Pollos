import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../constants/storage.constants';
import {
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RegistroResponse,
  RegisterPayload,
  ResetPasswordPayload,
  RolAlternable,
  SwitchRoleResponse,
  UpdateProfilePayload,
  Usuario,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly _usuario = signal<Usuario | null>(this.leerUsuarioGuardado());
  private readonly _token = signal<string | null>(this.leerTokenGuardado());

  readonly usuario = this._usuario.asReadonly();
  readonly token = this._token.asReadonly();

  readonly estaAutenticado = computed(() => this._token() !== null);

  /**
   * El acceso al panel se evalúa contra el rol ACTIVO, igual que el
   * RolesGuard del backend. Tener SUPERADMIN en `roles` no basta si la
   * cuenta está operando con otro rol activo.
   */
  readonly esSuperadmin = computed(() => this._usuario()?.rolActivo === 'SUPERADMIN');

  readonly esCuentaAdministrativa = computed(() => {
    const roles = this._usuario()?.roles ?? [];
    return roles.includes('ADMIN') || roles.includes('SUPERADMIN');
  });

  /**
   * La alternancia rápida CLIENTE ↔ TRABAJADOR se ofrece a cuentas de
   * usuario estándar. Las cuentas administrativas conservan su rol activo
   * para no perder acceso a sus funciones.
   */
  readonly puedeAlternarRol = computed(() => {
    const roles = this._usuario()?.roles ?? [];
    return (
      !this.esCuentaAdministrativa() && roles.includes('CLIENTE') && roles.includes('TRABAJADOR')
    );
  });

  login(credenciales: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credenciales)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta.access_token, respuesta.usuario)));
  }

  register(payload: RegisterPayload): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${this.apiUrl}/auth/register`, payload);
  }

  forgotPassword(correo: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/auth/forgot-password`, {
      correo,
    });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/reset-password`, payload);
  }

  getMe(): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${this.apiUrl}/users/me`)
      .pipe(tap((usuario) => this.actualizarUsuario(usuario)));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<Usuario> {
    return this.http
      .patch<Usuario>(`${this.apiUrl}/users/me`, payload)
      .pipe(tap((usuario) => this.actualizarUsuario(usuario)));
  }

  enableWorkerRole(): Observable<SwitchRoleResponse> {
    return this.http
      .post<SwitchRoleResponse>(`${this.apiUrl}/users/enable-worker-role`, {})
      .pipe(tap((respuesta) => this.guardarSesion(respuesta.access_token, respuesta.usuario)));
  }

  switchRole(nuevoRol: RolAlternable): Observable<SwitchRoleResponse> {
    return this.http
      .patch<SwitchRoleResponse>(`${this.apiUrl}/users/switch-role`, {
        nuevoRol,
      })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta.access_token, respuesta.usuario)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this._token.set(null);
    this._usuario.set(null);
    void this.router.navigate(['/login']);
  }

  private guardarSesion(token: string, usuario: Usuario): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this._token.set(token);
    this.actualizarUsuario(usuario);
  }

  private actualizarUsuario(usuario: Usuario): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  private leerTokenGuardado(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private leerUsuarioGuardado(): Usuario | null {
    const guardado = localStorage.getItem(USER_STORAGE_KEY);
    if (!guardado) {
      return null;
    }

    try {
      return JSON.parse(guardado) as Usuario;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }
}
