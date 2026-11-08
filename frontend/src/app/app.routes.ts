import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superadminGuard } from './core/guards/superadmin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: 'login',
    title: 'Iniciar sesión · Arréglalo Ya',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Crear cuenta · Arréglalo Ya',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    title: 'Recuperar acceso · Arréglalo Ya',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'profile',
    title: 'Mi perfil · Arréglalo Ya',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'superadmin',
    title: 'Superadministración · Arréglalo Ya',
    canActivate: [authGuard, superadminGuard],
    loadComponent: () =>
      import('./pages/superadmin/superadmin.component').then((m) => m.SuperadminComponent),
  },
  { path: '**', redirectTo: 'login' },
];
