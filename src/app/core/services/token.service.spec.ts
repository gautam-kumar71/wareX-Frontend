import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('saves tokens, user id, and schedules proactive refresh', () => {
    const spy = jest.spyOn(global, 'setTimeout');

    service.saveTokens({
      access_token: buildToken({ sub: 'user-1', role: 'ADMIN', exp: futureExp() }),
      refresh_token: 'refresh-1',
      expires_in: 300
    });

    expect(service.getAccessToken()).toBeTruthy();
    expect(service.getRefreshToken()).toBe('refresh-1');
    expect(service.getUserId()).toBe('user-1');
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 240000);
  });

  it('returns expired when no token exists', () => {
    expect(service.isTokenExpired()).toBe(true);
  });

  it('returns expired when token payload cannot be decoded', () => {
    localStorage.setItem('inv_access_token', 'bad-token');

    expect(service.isTokenExpired()).toBe(true);
  });

  it('returns false for valid unexpired tokens and exposes role', () => {
    const token = buildToken({ sub: 'user-2', role: 'PURCHASE_OFFICER', exp: futureExp() });
    localStorage.setItem('inv_access_token', token);

    expect(service.isTokenExpired()).toBe(false);
    expect(service.getUserRole()).toBe('PURCHASE_OFFICER');
  });

  it('clears all persisted tokens and pending refresh timers', () => {
    service.saveTokens({
      access_token: buildToken({ sub: 'user-3', role: 'WAREHOUSE_STAFF', exp: futureExp() }),
      refresh_token: 'refresh-2',
      expires_in: 180
    });

    service.clearTokens();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUserId()).toBeNull();
  });
});

function buildToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}
