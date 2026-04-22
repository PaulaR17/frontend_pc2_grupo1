import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  let hasAccess = false;

  if (token) {
    hasAccess = true;
  }

  if (!hasAccess) {
    router.navigate(['/login']);
  }

  return hasAccess;
};