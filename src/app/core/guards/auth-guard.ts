import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

//si no hay sesion manda al login
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  let permitido = false;

  if (authService.isLoggedIn()) {
    permitido = true;
  } else {
    router.navigate(['/login']);
  }

  return permitido;
};
