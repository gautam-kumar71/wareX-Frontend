import { HttpContext, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { errorInterceptor, SKIP_GLOBAL_ERROR_TOAST } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

describe('errorInterceptor', () => {
  const logout = jest.fn();
  const navigate = jest.fn();
  const error = jest.fn();
  const warning = jest.fn();

  beforeEach(() => {
    logout.mockReset();
    navigate.mockReset();
    error.mockReset();
    warning.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { logout } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { error, warning } }
      ]
    });
  });

  it('logs out and redirects on 401 responses', (done) => {
    const request = new HttpRequest('GET', '/api/secure');

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }))
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          expect(logout).toHaveBeenCalled();
          expect(navigate).toHaveBeenCalledWith(['/login']);
          expect(error).not.toHaveBeenCalled();
          expect(warning).not.toHaveBeenCalled();
          done();
        }
      })
    );
  });

  it('shows a warning toast for service outages', (done) => {
    const request = new HttpRequest('GET', '/api/reports');

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }))
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(503);
          expect(warning).toHaveBeenCalledWith(
            'The service is temporarily unavailable. We are working to bring it back online.'
          );
          done();
        }
      })
    );
  });

  it('shows an error toast for offline requests', (done) => {
    const request = new HttpRequest('GET', '/api/reports');

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }))
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(0);
          expect(error).toHaveBeenCalledWith(
            'Cannot connect to the server. Please check your internet connection.'
          );
          done();
        }
      })
    );
  });

  it('shows a warning toast for forbidden responses', (done) => {
    const request = new HttpRequest('GET', '/api/admin');

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: { message: 'Admin access required' }
          })
        )
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(403);
          expect(warning).toHaveBeenCalledWith('Admin access required');
          done();
        }
      })
    );
  });

  it('does not show a toast for not found responses', (done) => {
    const request = new HttpRequest('GET', '/api/missing');

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          expect(error).not.toHaveBeenCalled();
          expect(warning).not.toHaveBeenCalled();
          done();
        }
      })
    );
  });

  it('suppresses global toasts when the request opts out', (done) => {
    const request = new HttpRequest('GET', '/api/profile', {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true)
    });

    TestBed.runInInjectionContext(() =>
      errorInterceptor(request, () =>
        throwError(() =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Server Error',
            error: { message: 'Profile sync failed' }
          })
        )
      ).subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
          expect(error).not.toHaveBeenCalled();
          expect(warning).not.toHaveBeenCalled();
          done();
        }
      })
    );
  });
});
