import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: { navigate: jest.Mock };
  let tokenService: {
    getAccessToken: jest.Mock;
    saveTokens: jest.Mock;
    clearTokens: jest.Mock;
  };

  const createService = () => TestBed.inject(AuthService);

  beforeEach(() => {
    localStorage.clear();
    router = {
      navigate: jest.fn()
    };
    tokenService = {
      getAccessToken: jest.fn().mockReturnValue(null),
      saveTokens: jest.fn(),
      clearTokens: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        {
          provide: NgZone,
          useFactory: () => new NgZone({ enableLongStackTrace: false })
        },
        { provide: Router, useValue: router },
        { provide: TokenService, useValue: tokenService }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
  });

  it('loads the cached user from storage during construction', () => {
    const savedUser: User = { fullName: 'Asha', role: 'ADMIN' };
    localStorage.setItem('warex_user', JSON.stringify(savedUser));

    const service = createService();

    expect(service.currentUserValue).toEqual(savedUser);
  });

  it('clears malformed cached users from storage', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('warex_user', '{bad-json');

    const service = createService();

    expect(service.currentUserValue).toBeNull();
    expect(localStorage.getItem('warex_user')).toBeNull();
    errorSpy.mockRestore();
  });

  it('checks the session when a token exists and logs out on profile failure', () => {
    tokenService.getAccessToken.mockReturnValue('token');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    createService();

    const req = httpMock.expectOne((request) => request.url.endsWith('/me'));
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(tokenService.clearTokens).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('logs in, persists tokens, fetches the profile, and navigates to the dashboard', () => {
    const service = createService();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    service.login({ email: 'user@warex.com', password: 'Secret123!' }).subscribe();

    let req = httpMock.expectOne((request) => request.url.endsWith('/login'));
    expect(req.request.method).toBe('POST');
    req.flush({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer'
      }
    });

    req = httpMock.expectOne((request) => request.url.endsWith('/me'));
    req.flush({
      data: {
        email: 'user@warex.com',
        role: 'ADMIN'
      }
    });

    expect(tokenService.saveTokens).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 3600,
      token_type: 'Bearer'
    });
    expect(localStorage.getItem('warex_user')).toContain('user@warex.com');
    expect(service.currentUserValue?.role).toBe('ADMIN');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);

    logSpy.mockRestore();
  });

  it('registers without redirecting after the profile fetch succeeds', () => {
    const service = createService();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    service.register({ fullName: 'New User', email: 'new@warex.com', password: 'Secret123!' }).subscribe();

    let req = httpMock.expectOne((request) => request.url.endsWith('/register'));
    expect(req.request.method).toBe('POST');
    req.flush({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer'
      }
    });

    req = httpMock.expectOne((request) => request.url.endsWith('/me'));
    req.flush({
      data: {
        email: 'new@warex.com',
        role: 'PURCHASE_OFFICER'
      }
    });

    expect(router.navigate).not.toHaveBeenCalledWith(['/dashboard']);
    expect(tokenService.saveTokens).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('falls back to dashboard navigation when the profile fetch after Google login fails', () => {
    const service = createService();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    service.loginWithGoogle('google-token').subscribe();

    let req = httpMock.expectOne((request) => request.url.endsWith('/oauth2/google'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idToken: 'google-token' });
    req.flush({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer'
      }
    });

    req = httpMock.expectOne((request) => request.url.endsWith('/me'));
    req.flush({}, { status: 500, statusText: 'Server error' });

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('updates the cached profile and logs out after password changes', () => {
    localStorage.setItem('warex_user', JSON.stringify({ fullName: 'Before', role: 'ADMIN' }));
    const service = createService();

    service.updateProfile({ fullName: 'After' }).subscribe((response) => {
      expect(response.data.fullName).toBe('After');
    });

    let req = httpMock.expectOne((request) => request.url.endsWith('/profile'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { fullName: 'After' } });

    expect(service.currentUserValue?.fullName).toBe('After');
    expect(localStorage.getItem('warex_user')).toContain('After');

    service.updatePassword({ currentPassword: 'old', newPassword: 'NewPass123!' }).subscribe();

    req = httpMock.expectOne((request) => request.url.endsWith('/password'));
    expect(req.request.method).toBe('PATCH');
    req.flush({});

    expect(tokenService.clearTokens).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('supports role helpers and admin endpoints', () => {
    localStorage.setItem('warex_user', JSON.stringify({ role: 'ADMIN', fullName: 'Admin User' }));
    const service = createService();

    expect(service.isAuthenticated()).toBe(false);
    tokenService.getAccessToken.mockReturnValue('token');
    expect(service.isAuthenticated()).toBe(true);

    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasAnyRole(['WAREHOUSE_STAFF', 'ADMIN'])).toBe(true);
    expect(service.canManageProducts()).toBe(true);
    expect(service.canCreateOrders()).toBe(true);
    expect(service.canApproveOrders()).toBe(true);
    expect(service.canViewStock()).toBe(true);
    expect(service.canManageWarehouses()).toBe(true);
    expect(service.canAdministerSuppliers()).toBe(true);
    expect(service.canViewPayments()).toBe(true);
    expect(service.canViewAlerts()).toBe(true);

    service.getUsers().subscribe((response) => expect(response.data[0].userId).toBe('u-1'));
    let req = httpMock.expectOne((request) => request.url.endsWith('/admin/users'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ userId: 'u-1' }] });

    service.updateUserRole('u-1', 'INVENTORY_MANAGER').subscribe((response) => expect(response.data.role).toBe('INVENTORY_MANAGER'));
    req = httpMock.expectOne((request) => request.url.endsWith('/admin/users/u-1/role?role=INVENTORY_MANAGER'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { role: 'INVENTORY_MANAGER' } });
  });
});
