export type Rol = 'CLIENTE' | 'TRABAJADOR' | 'ADMIN' | 'SUPERADMIN';
export type RolAlternable = Extract<Rol, 'CLIENTE' | 'TRABAJADOR'>;
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
export type EstadoAdministrable = Extract<EstadoUsuario, 'ACTIVO' | 'INACTIVO'>;

export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  roles: Rol[];
  rolActivo: Rol;
  estado: EstadoUsuario;
}

export interface LoginResponse {
  access_token: string;
  usuario: Usuario;
}

export interface RegistroResponse {
  usuario: Usuario;
}

export interface SwitchRoleResponse {
  access_token: string;
  usuario: Usuario;
}

export interface ForgotPasswordResponse {
  message: string;
  codigo?: string;
  expiraEnMinutos?: number;
}

export interface MessageResponse {
  message: string;
}

export interface LoginPayload {
  correo: string;
  contrasena: string;
}

export interface RegisterPayload {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  contrasena: string;
  registrarseComoTrabajador?: boolean;
}

export interface UpdateProfilePayload {
  nombres: string;
  apellidos: string;
  telefono: string;
}

export interface ResetPasswordPayload {
  correo: string;
  codigo: string;
  nuevaContrasena: string;
}

export interface CreateAdminPayload {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  contrasena: string;
}

export interface UpdateAdminPayload {
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  roles?: Rol[];
  estado?: EstadoAdministrable;
}

export interface ActorAuditoria {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

export interface RegistroAuditoria {
  idAuditoria: string;
  accion: string;
  entidadAfectada: string;
  idEntidadAfectada: string | null;
  detalle: Record<string, unknown> | null;
  fechaEvento: string;
  actor: ActorAuditoria | null;
}
