import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { TokenService } from '../services/token.service';

describe('roleGuard', () => {
  const createUrlTree = jest.fn();

  beforeEach(() => {
    createUrlTree.mockReset();
    createUrlTree.mockReturnValue({ redirectedTo: '/unauthorized' });
  });

  it('allows users whose role is in the allowed list', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { getUserRole: () => 'ADMIN' } },
        { provide: Router, useValue: { createUrlTree } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN', 'PURCHASE_OFFICER'])());

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('returns an unauthorized UrlTree when the user lacks the role', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { getUserRole: () => 'WAREHOUSE_STAFF' } },
        { provide: Router, useValue: { createUrlTree } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])());

    expect(result).toEqual({ redirectedTo: '/unauthorized' });
    expect(createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
  });
});
