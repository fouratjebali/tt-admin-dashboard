import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loginTree = router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });

  if (!authService.isAuthenticated()) {
    return loginTree;
  }

  if (authService.currentAdmin()) {
    return true;
  }

  return authService.loadAuthenticatedUser().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(loginTree);
    }),
  );
};
