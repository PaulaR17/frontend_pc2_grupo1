import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

//deja pasar solo a usuarios ADMIN
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  let permitido = false;

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
  } else if (authService.isAdmin()) {
    permitido = true;
  } else {
    router.navigate(['/user-home']);
  }

  return permitido;
};
