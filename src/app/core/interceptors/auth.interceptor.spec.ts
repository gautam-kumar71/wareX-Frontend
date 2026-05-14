import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../services/token.service';

describe('authInterceptor', () => {
  it('adds the bearer token when one is available', (done) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { getAccessToken: () => 'token-123' } }
      ]
    });

    const request = new HttpRequest('GET', '/api/orders');

    TestBed.runInInjectionContext(() =>
      authInterceptor(request, (nextRequest) => {
        expect(nextRequest.headers.get('Authorization')).toBe('Bearer token-123');
        return of(new HttpResponse({ status: 200 }));
      }).subscribe(() => done())
    );
  });

  it('forwards the original request unchanged when no token exists', (done) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { getAccessToken: () => null } }
      ]
    });

    const request = new HttpRequest('GET', '/api/orders');

    TestBed.runInInjectionContext(() =>
      authInterceptor(request, (nextRequest) => {
        expect(nextRequest).toBe(request);
        expect(nextRequest.headers.has('Authorization')).toBe(false);
        return of(new HttpResponse({ status: 200 }));
      }).subscribe(() => done())
    );
  });
});
