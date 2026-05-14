import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('redirects unauthenticated users to login', () => {
    configureTestingModule({
      isAuthenticated: () => false,
      currentUserValue: null
    });

    const result = TestBed.runInInjectionContext(() => authGuard(buildRoute()));

    expect(result).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirects authenticated users without the required role to dashboard', () => {
    configureTestingModule({
      isAuthenticated: () => true,
      currentUserValue: { role: 'WAREHOUSE_STAFF' }
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(buildRoute({ expectedRoles: ['ADMIN', 'PURCHASE_OFFICER'] }))
    );

    expect(result).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows authenticated users with the required role', () => {
    configureTestingModule({
      isAuthenticated: () => true,
      currentUserValue: { role: 'ADMIN' }
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard(buildRoute({ expectedRoles: ['ADMIN'] }))
    );

    expect(result).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('allows authenticated users when no role restriction is provided', () => {
    configureTestingModule({
      isAuthenticated: () => true,
      currentUserValue: { role: 'WAREHOUSE_STAFF' }
    });

    const result = TestBed.runInInjectionContext(() => authGuard(buildRoute()));

    expect(result).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});

function configureTestingModule(authService: Partial<AuthService>) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: { navigate } }
    ]
  });
}

function buildRoute(data: Record<string, unknown> = {}): ActivatedRouteSnapshot {
  return { data } as ActivatedRouteSnapshot;
}

const navigate = jest.fn();
