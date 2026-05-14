import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const httpLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startedAt = performance.now();
  console.debug(`[HTTP] -> ${req.method} ${req.urlWithParams}`);

  return next(req).pipe(
    tap({
      next: event => {
        if ('status' in event) {
          const elapsed = Math.round(performance.now() - startedAt);
          console.debug(`[HTTP] <- ${req.method} ${req.urlWithParams} ${event.status} (${elapsed}ms)`);
        }
      },
      error: error => {
        const elapsed = Math.round(performance.now() - startedAt);
        console.warn(`[HTTP] xx ${req.method} ${req.urlWithParams} ${error?.status ?? 'ERR'} (${elapsed}ms)`);
      }
    })
  );
};
