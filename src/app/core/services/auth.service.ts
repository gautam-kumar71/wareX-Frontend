import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { getApiUrl } from '../config/api.config';
import { TokenService } from './token.service';

export type SystemRole =
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'PURCHASE_OFFICER'
  | 'WAREHOUSE_STAFF';

export interface User {
  userId?: string;
  email?: string;
  fullName?: string;
  role?: SystemRole;
  isOAuth2User?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = getApiUrl('auth');
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  constructor(
    private http: HttpClient, 
    private router: Router,
    private tokenService: TokenService,
    private ngZone: NgZone
  ) {
    this.loadUserFromStorage();
    this.checkSession();
  }

  private checkSession() {
    if (this.tokenService.getAccessToken() && !this.currentUserSubject.value) {
      console.log('[AuthService] Token found but no user in state, fetching profile...');
      this.fetchMe().subscribe({
        error: () => {
          console.error('[AuthService] Session check failed, clearing tokens');
          this.logout();
        }
      });
    }
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.handleAuth(res.data, true))
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(res => this.handleAuth(res.data, false))
    );
  }

  requestPasswordResetOtp(payload: ForgotPasswordRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, payload);
  }

  resetPasswordWithOtp(payload: ResetPasswordRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, payload);
  }

  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/oauth2/google`, { idToken }).pipe(
      tap(res => this.handleAuth(res.data, true))
    );
  }

  logout() {
    this.tokenService.clearTokens();
    localStorage.removeItem('warex_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private handleAuth(authData: AuthResponse, redirectToDashboard: boolean) {
    console.log('[AuthService] Handling auth success, data:', authData);
    
    this.tokenService.saveTokens(authData);
    
    console.log('[AuthService] Token set, fetching profile...');
    this.fetchMe().subscribe({
      next: () => {
        if (!redirectToDashboard) {
          return;
        }

        console.log('[AuthService] Profile fetch success, navigating to dashboard');
        this.ngZone.run(() => this.router.navigate(['/dashboard']));
      },
      error: (err) => {
        console.error('[AuthService] Failed to fetch user profile after login', err);
        if (!redirectToDashboard) {
          return;
        }

        // If profile fetch fails, we might still want to try navigating.
        this.ngZone.run(() => this.router.navigate(['/dashboard']));
      }
    });
  }

  fetchMe(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        localStorage.setItem('warex_user', JSON.stringify(res.data));
        this.currentUserSubject.next(res.data);
      })
    );
  }

  private loadUserFromStorage() {
    const savedUser = localStorage.getItem('warex_user');
    if (savedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(savedUser));
      } catch (e) {
        console.error('[AuthService] Failed to parse saved user', e);
        localStorage.removeItem('warex_user');
      }
    }
  }

  getToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: SystemRole): boolean {
    return this.currentUserValue?.role === role;
  }

  hasAnyRole(roles: SystemRole[]): boolean {
    const role = this.currentUserValue?.role;
    return !!role && roles.includes(role);
  }

  canViewProducts(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF']);
  }

  canManageProducts(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER']);
  }

  canViewOrders(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF']);
  }

  canCreateOrders(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canApproveOrders(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER']);
  }

  canCancelOrders(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER']);
  }

  canReceivePurchaseOrders(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF']);
  }

  canViewStock(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF']);
  }

  canManageThresholds(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER']);
  }

  canInitializeStock(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER']);
  }

  canViewWarehouses(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF']);
  }

  canManageWarehouses(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER']);
  }

  canViewSuppliers(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canManageSuppliers(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canAdministerSuppliers(): boolean {
    return this.hasRole('ADMIN');
  }

  canViewPayments(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canProcessPayments(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canCancelPayments(): boolean {
    return this.hasAnyRole(['ADMIN', 'PURCHASE_OFFICER']);
  }

  canViewReports(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF']);
  }

  canViewAlerts(): boolean {
    return this.hasAnyRole(['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF']);
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users`);
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/users/${userId}/role?role=${role}`, {});
  }

  updateProfile(profileData: { fullName: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/profile`, profileData).pipe(
      tap(res => {
        const current = this.currentUserSubject.value;
        if (current) {
          const updated = { ...current, ...res.data };
          localStorage.setItem('warex_user', JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  updatePassword(passwordData: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/password`, passwordData).pipe(
      tap(() => this.logout()) // Force logout on password change
    );
  }
}
