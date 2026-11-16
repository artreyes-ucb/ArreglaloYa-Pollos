import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const workerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.usuario()?.rolActivo === 'TRABAJADOR'
    ? true
    : router.createUrlTree(['/profile']);
};
