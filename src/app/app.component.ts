import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  template: `
    <app-toast></app-toast>
    <div class="app-shell" *ngIf="showAppShell(); else publicContent">
      <div class="floating-brand" routerLink="/dashboard" [class.brand-hidden]="isBrandHidden">
        <div class="logo-box">W</div>
        <span class="logo-text">WareX</span>
      </div>

      <header class="navbar-wrapper">
        <nav class="top-nav">
          <div class="nav-body">
            <div class="nav-utility" *ngIf="currentUser$ | async as user; else navSkeleton">
              <div class="nav-right">
                <div class="utility-links">
                  <a class="utility-link" routerLink="/stock-movements" routerLinkActive="active" *ngIf="canViewStockMovements()">
                    <span class="utility-icon">🕘</span>
                    <span>History</span>
                  </a>
                  <a class="utility-link" routerLink="/alerts" routerLinkActive="active" *ngIf="canViewAlerts()">
                    <span class="utility-icon">🔔</span>
                    <span>Notifications</span>
                  </a>
                  <a class="utility-link" routerLink="/reports" routerLinkActive="active" *ngIf="canViewReports()">
                    <span class="utility-icon">📊</span>
                    <span>Reports</span>
                  </a>
                  <a class="utility-link" routerLink="/api-docs" routerLinkActive="active">
                    <span class="utility-icon">🧭</span>
                    <span>API Docs</span>
                  </a>
                  <a class="utility-link" routerLink="/admin/users" routerLinkActive="active" *ngIf="isAdmin()">
                    <span class="utility-icon">⚙️</span>
                    <span>Admin</span>
                  </a>
                </div>

                <div class="user-pill" routerLink="/profile">
                  <span class="initials">{{ user.fullName?.[0] || '?' }}</span>
                  <span class="name">{{ user.fullName?.split(' ')?.[0] || 'User' }}</span>
                  <div class="status-dot"></div>
                </div>

                <button class="logout-icon" (click)="onLogout()" title="Sign Out">🚪</button>
              </div>
            </div>

            <div class="nav-center">
              <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
              <a routerLink="/products" routerLinkActive="active" *ngIf="canViewProducts()">Products</a>
              <a routerLink="/purchase-orders" routerLinkActive="active" *ngIf="canViewOrders()">Orders</a>
              <a routerLink="/stock" routerLinkActive="active" *ngIf="canViewStock()">Stock</a>
              <a routerLink="/warehouses" routerLinkActive="active" *ngIf="canViewWarehouses()">Warehouses</a>
              <a routerLink="/suppliers" routerLinkActive="active" *ngIf="canViewSuppliers()">Suppliers</a>
              <a routerLink="/payments" routerLinkActive="active" *ngIf="canViewPayments()">Payments</a>
            </div>
          </div>
        </nav>
      </header>

      <main class="page-container">
        <router-outlet></router-outlet>
      </main>
    </div>

    <ng-template #publicContent><router-outlet></router-outlet></ng-template>

    <ng-template #navSkeleton>
      <div class="nav-utility nav-utility-skeleton">
        <div class="nav-right">
          <div class="utility-links"></div>
          <div class="user-pill skeleton-pill">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .app-shell { min-height: 100vh; background: var(--bg-main); background-image: radial-gradient(circle at 50% -20%, rgba(74, 124, 68, 0.05), transparent 60%); }
    .floating-brand { position: fixed; top: 1rem; left: 2rem; z-index: 1100; display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.8rem 1rem; border-radius: 18px; border: 1px solid var(--border); background: rgba(6, 6, 6, 0.92); box-shadow: 0 18px 36px rgba(0,0,0,0.45); cursor: pointer; transition: transform 0.28s ease, opacity 0.28s ease, visibility 0.28s ease; will-change: transform, opacity; max-width: calc(100vw - 2rem); }
    .floating-brand.brand-hidden { transform: translateY(-26px) scale(0.92); opacity: 0; visibility: hidden; pointer-events: none; }
    .navbar-wrapper { position: sticky; top: 0; display: flex; justify-content: center; padding: 1rem 2rem 0.85rem 12rem; z-index: 1000; }
    .top-nav { background: var(--nav-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 18px; width: 100%; max-width: 1180px; display: block; padding: 0.9rem 1.25rem; box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden; }
    .logo-box { width: 30px; height: 30px; background: linear-gradient(135deg, var(--primary), #7eb36f); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; box-shadow: 0 10px 20px rgba(74, 124, 68, 0.28); }
    .logo-text { font-weight: 900; font-size: 1.15rem; letter-spacing: 0.01em; color: white; }
    .nav-body { min-width: 0; display: flex; flex-direction: column; gap: 0.7rem; }
    .nav-utility { display: flex; justify-content: flex-end; align-items: center; gap: 0.9rem; }
    .nav-utility-skeleton { justify-content: flex-end; }
    .utility-links { display: flex; flex-wrap: wrap; gap: 0.45rem; min-width: 0; }
    .utility-link { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text-muted); text-decoration: none; font-size: 0.82rem; font-weight: 700; padding: 0.42rem 0.8rem; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); transition: all 0.2s; white-space: nowrap; }
    .utility-link:hover { color: white; border-color: var(--primary-soft); background: rgba(255,255,255,0.04); }
    .utility-link.active { color: white; border-color: rgba(74, 124, 68, 0.35); background: rgba(74, 124, 68, 0.16); }
    .utility-icon { font-size: 0.9rem; line-height: 1; }
    .nav-center { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.4rem; background: rgba(0,0,0,0.3); padding: 0.3rem; border-radius: 14px; border: 1px solid var(--border); min-width: 0; }
    .nav-center a { color: var(--text-muted); text-decoration: none; font-size: 0.85rem; font-weight: 700; padding: 0.5rem 1rem; border-radius: 10px; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; text-align: center; }
    .nav-center a:hover { color: white; background: rgba(255,255,255,0.03); }
    .nav-center a.active { color: white; background: var(--primary); box-shadow: 0 4px 15px rgba(74, 124, 68, 0.2); }
    .nav-right { display: flex; align-items: center; gap: 0.75rem; margin-left: auto; min-width: 0; }
    .user-pill { display: flex; align-items: center; gap: 0.75rem; background: #080808; padding: 0.3rem; padding-right: 1rem; border-radius: 12px; cursor: pointer; border: 1px solid var(--border); transition: all 0.2s; }
    .user-pill:hover { border-color: var(--primary-soft); background: #0c0c0c; }
    .initials { width: 26px; height: 26px; background: var(--primary); color: white; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; }
    .name { font-size: 0.92rem; font-weight: 700; color: #e2e8f0; }
    .status-dot { width: 7px; height: 7px; background: var(--status-success); border-radius: 50%; box-shadow: 0 0 10px var(--status-success); }
    .logout-icon { background: transparent; border: none; cursor: pointer; opacity: 0.65; transition: all 0.2s; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .logout-icon:hover { opacity: 1; transform: translateX(2px); }
    .skeleton-pill { border-color: transparent; background: rgba(255,255,255,0.02); }
    .skeleton-avatar { width: 26px; height: 26px; border-radius: 7px; background: rgba(255,255,255,0.05); }
    .skeleton-text { width: 60px; height: 10px; border-radius: 4px; background: rgba(255,255,255,0.05); }

    @media (max-width: 1200px) {
      .floating-brand { left: 1.25rem; }
      .navbar-wrapper { padding: 0.85rem 1.25rem 0.75rem 10rem; }
    }

    @media (max-width: 1080px) {
      .top-nav { padding: 0.8rem 1rem; }
      .utility-link { font-size: 0.78rem; padding: 0.4rem 0.65rem; }
      .nav-center a { font-size: 0.77rem; padding: 0.5rem 0.7rem; }
    }

    @media (max-width: 900px) {
      .floating-brand { position: static; margin: 0.85rem 0.85rem 0; width: fit-content; }
      .navbar-wrapper { position: static; top: auto; padding: 0.75rem 0.85rem 0.75rem; }
      .nav-center { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }

    @media (max-width: 768px) {
      .top-nav { padding: 0.85rem; border-radius: 18px; gap: 0.85rem; }
      .nav-utility { flex-direction: column; align-items: stretch; gap: 0.7rem; }
      .nav-right { width: 100%; gap: 0.55rem; flex-wrap: wrap; }
      .utility-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem; width: 100%; }
      .utility-link { justify-content: center; min-width: 0; font-size: 0.66rem; padding: 0.6rem 0.35rem; }
      .nav-center { width: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem; padding: 0.35rem; border-radius: 16px; }
      .nav-center a { min-width: 0; font-size: 0.66rem; line-height: 1.15; padding: 0.65rem 0.35rem; white-space: normal; }
      .user-pill { width: calc(100% - 2.8rem); min-width: 0; flex: 1 1 auto; padding-right: 0.85rem; }
      .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .logout-icon { width: 2.25rem; height: 2.25rem; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); opacity: 0.9; }
    }

    @media (max-width: 480px) {
      .floating-brand { margin: 0.65rem 0.65rem 0; padding: 0.7rem 0.85rem; border-radius: 16px; }
      .top-nav { gap: 0.7rem; padding: 0.7rem; border-radius: 16px; }
      .logo-box { width: 28px; height: 28px; border-radius: 8px; font-size: 1rem; }
      .logo-text { font-size: 1rem; }
      .utility-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nav-center { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; padding: 0.3rem; border-radius: 14px; }
      .nav-center a { font-size: 0.63rem; padding: 0.6rem 0.25rem; border-radius: 9px; }
      .user-pill { padding-right: 0.65rem; border-radius: 10px; }
      .nav-right { gap: 0.4rem; }
      .logout-icon { width: 2.15rem; height: 2.15rem; font-size: 1rem; }
    }
  `]
})
export class AppComponent {
  currentUser$ = this.authService.currentUser$;
  isBrandHidden = false;
  private lastScrollY = 0;

  constructor(private authService: AuthService, private router: Router) {}

  @HostListener('window:scroll')
  onWindowScroll() {
    const currentScrollY = window.scrollY || 0;

    if (currentScrollY <= 24) {
      this.isBrandHidden = false;
      this.lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY > this.lastScrollY + 6) {
      this.isBrandHidden = true;
    } else if (currentScrollY < this.lastScrollY - 6) {
      this.isBrandHidden = false;
    }

    this.lastScrollY = currentScrollY;
  }

  isAuthenticated() { return this.authService.isAuthenticated(); }

  showAppShell() {
    return this.isAuthenticated() && !this.isPublicAuthRoute();
  }

  isAdmin() {
    return this.authService.hasRole('ADMIN');
  }

  canViewProducts() {
    return this.authService.canViewProducts();
  }

  canViewOrders() {
    return this.authService.canViewOrders();
  }

  canViewStock() {
    return this.authService.canViewStock();
  }

  canViewWarehouses() {
    return this.authService.canViewWarehouses();
  }

  canViewSuppliers() {
    return this.authService.canViewSuppliers();
  }

  canViewPayments() {
    return this.authService.canViewPayments();
  }

  canViewStockMovements() {
    return this.authService.canViewStock();
  }

  canViewReports() {
    return this.authService.canViewReports();
  }

  canViewAlerts() {
    return this.authService.canViewAlerts();
  }

  private isPublicAuthRoute(): boolean {
    return ['/login', '/register', '/oauth2/success', '/oauth2/failure'].some(path => this.router.url.startsWith(path));
  }

  onLogout() { this.authService.logout(); }
}
