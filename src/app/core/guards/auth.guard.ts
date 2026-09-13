import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AdminIdentity, AdminRole } from '../models/backend-api.model';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data?.['roles'] as AdminRole[] | undefined;
  const loginTree = router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
  const deniedTree = router.createUrlTree(['/'], {
    queryParams: {
      denied: '1',
    },
  });

  const evaluateAccess = (admin: AdminIdentity) => {
    if (!authService.canAccessDashboard(admin)) {
      authService.logout();
      return router.createUrlTree(['/login'], {
        queryParams: {
          returnUrl: state.url,
          reason: 'access-denied',
        },
      });
    }

    if (!authService.canAccessRoles(allowedRoles, admin)) {
      return deniedTree;
    }

    return true;
  };

  if (!authService.isAuthenticated()) {
    return loginTree;
  }

  const currentAdmin = authService.currentAdmin();

  if (currentAdmin) {
    return evaluateAccess(currentAdmin);
  }

  return authService.loadAuthenticatedUser().pipe(
    map((admin) => evaluateAccess(admin)),
    catchError(() => {
      authService.logout();
      return of(loginTree);
    }),
  );
};
