import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRoles = route.data['expectedRoles'] as string[];
  if (expectedRoles && expectedRoles.length > 0) {
    const user = authService.currentUserValue;
    if (!user || !expectedRoles.includes(user.role || '')) {
      router.navigate(['/dashboard']); // or some access-denied page
      return false;
    }
  }

  return true;
};
