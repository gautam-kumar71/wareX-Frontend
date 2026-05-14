import { Injectable, inject } from '@angular/core';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  fullName: string;
  iat: number;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class TokenService {

  private readonly ACCESS_TOKEN_KEY  = 'inv_access_token';
  private readonly REFRESH_TOKEN_KEY = 'inv_refresh_token';
  private readonly USER_ID_KEY       = 'inv_user_id';

  // Proactive refresh timer
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  saveTokens(response: any): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY,  response.access_token);
    if(response.refresh_token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
    }

    const payload = this.decodeToken(response.access_token);
    if (payload) {
      localStorage.setItem(this.USER_ID_KEY, payload.sub);
    }

    // Schedule proactive refresh 60 seconds before expiry
    if (response.expires_in) {
        this.scheduleRefresh(response.expires_in);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    const payload = this.decodeToken(token);
    if (!payload) return true;
    return Date.now() >= payload.exp * 1000;
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const base64Payload = token.split('.')[1];
      const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  getUserRole(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    const payload = this.decodeToken(token);
    return payload?.role ?? null;
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const refreshInMs = (expiresInSeconds - 60) * 1000; // 60s before expiry
    if (refreshInMs > 0) {
      this.refreshTimer = setTimeout(() => {
        // Refresh logic would go here if needed
      }, refreshInMs);
    }
  }
}
