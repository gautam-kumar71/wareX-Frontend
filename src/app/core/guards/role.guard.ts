import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { TokenService } from '../services/token.service';

export const roleGuard = (allowedRoles: string[]) =>
  (): boolean | UrlTree => {
    const tokenService = inject(TokenService);
    const router = inject(Router);
    const role = tokenService.getUserRole();
    if (role && allowedRoles.includes(role)) return true;
    return router.createUrlTree(['/unauthorized']);
  };
