import { HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const SKIP_GLOBAL_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const skipGlobalErrorToast = req.context.get(SKIP_GLOBAL_ERROR_TOAST);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.status === 0) {
        errorMessage = 'Cannot connect to the server. Please check your internet connection.';
        if (!skipGlobalErrorToast) {
          toastService.error(errorMessage);
        }
      } else if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
        errorMessage = 'Session expired or unauthorized access.';
      } else if (error.status === 403) {
        errorMessage = error.error?.message || 'You do not have permission to perform this action.';
        if (!skipGlobalErrorToast) {
          toastService.warning(errorMessage);
        }
      } else if (error.status === 503 || error.status === 504) {
        errorMessage = 'The service is temporarily unavailable. We are working to bring it back online.';
        if (!skipGlobalErrorToast) {
          toastService.warning(errorMessage);
        }
      } else if (error.status === 404) {
        errorMessage = 'The requested resource or service was not found.';
        // Don't toast for every 404 as it might be common, but maybe for specific API paths?
      } else {
        errorMessage = error.error?.message || error.statusText || 'Server Error';
        if (!skipGlobalErrorToast) {
          toastService.error(errorMessage);
        }
      }

      return throwError(() => error);
    })
  );
};
