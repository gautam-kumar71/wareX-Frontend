import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ReportService, DashboardStats } from '../../core/services/report.service';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-wrapper">
      
      <header class="greeting-section">
        <label>Welcome back</label>
        <h1>{{ (user$ | async)?.fullName }}</h1>
        <p class="user-meta">{{ (user$ | async)?.email }} • {{ (user$ | async)?.role }}</p>
      </header>

      <div class="stats-row" *ngIf="stats$ | async as stats">
        <div class="card mini-card">
          <div class="icon-circle">🚛</div>
          <div class="val">{{ stats.shipments }}</div>
          <label>Shipments</label>
        </div>
        <div class="card mini-card">
          <div class="icon-circle">📄</div>
          <div class="val">{{ stats.openOrders }}</div>
          <label>Open Orders</label>
        </div>
        <div class="card mini-card">
          <div class="icon-circle">🏢</div>
          <div class="val">{{ stats.activeSuppliers }}</div>
          <label>Suppliers</label>
        </div>
        <div class="card mini-card">
          <div class="icon-circle">💰</div>
          <div class="val">{{ stats.totalValue | currency:'INR':'symbol':'1.2-2' }}</div>
          <label>Total Value</label>
        </div>
      </div>

      <div class="actions-grid">
        <div class="card action-card primary-action" routerLink="/purchase-orders/new" *ngIf="canCreateOrder()">
          <div class="action-icon search-bg">
            <span class="icon">➕</span>
          </div>
          <div class="action-content">
            <h3>New Order</h3>
            <p>Create a new order and manage vendor shipments</p>
          </div>
          <span class="arrow">→</span>
        </div>

        <div class="card action-card" routerLink="/profile">
          <div class="action-icon profile-bg">
            <span class="icon">👤</span>
          </div>
          <div class="action-content">
            <h3>My Profile</h3>
            <p>Update your name, password and account settings</p>
          </div>
          <span class="arrow">→</span>
        </div>
      </div>

      <div class="card tips-card">
        <div class="tips-header">
          <span class="icon">💡</span>
          <h3>Useful Tips</h3>
        </div>
        <div class="tips-grid">
          <div class="tip-item">
            <div class="tip-num">01</div>
            <p>Check <strong>Stock History</strong> to see all recent movements in your warehouses.</p>
          </div>
          <div class="tip-item">
            <div class="tip-num">02</div>
            <p>You can approve pending invoices in the <strong>Payments</strong> section.</p>
          </div>
          <div class="tip-item">
            <div class="tip-num">03</div>
            <p>Make sure to keep your <strong>Profile</strong> details up to date for security.</p>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .dashboard-wrapper { max-width: 1000px; margin: 0 auto; }

    .greeting-section { margin-bottom: 4rem; }
    .greeting-section label { font-size: 0.75rem; font-weight: 800; color: var(--primary); letter-spacing: 0.15em; text-transform: uppercase; }
    .greeting-section h1 { font-size: 3.5rem; font-weight: 900; margin: 0.5rem 0; letter-spacing: -0.04em; color: white; }
    .user-meta { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .mini-card { padding: 2rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .icon-circle { width: 44px; height: 44px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-bottom: 1.25rem; }
    .mini-card .val { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.25rem; color: white; }
    .mini-card label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

    .actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .action-card { padding: 2rem; display: flex; align-items: center; gap: 1.5rem; cursor: pointer; }
    .action-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; background: #000; border: 1px solid var(--border); }
    .search-bg { background: var(--primary-soft); border-color: rgba(74, 124, 68, 0.2); color: var(--primary); }
    .profile-bg { background: rgba(255, 255, 255, 0.02); }
    .action-content h3 { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.4rem; color: white; }
    .action-content p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
    .arrow { margin-left: auto; color: var(--text-muted); font-size: 1.1rem; opacity: 0.3; }

    .tips-card { padding: 3rem; background: radial-gradient(circle at top right, rgba(74, 124, 68, 0.03), transparent); }
    .tips-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem; }
    .tips-header h3 { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); }
    .tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; }
    .tip-num { font-size: 1.25rem; font-weight: 900; color: #1a1a1a; margin-bottom: 1rem; }
    .tip-item p { font-size: 0.85rem; color: #94a3b8; line-height: 1.7; }
    .tip-item strong { color: white; border-bottom: 1px solid var(--primary-soft); }
    @media (max-width: 1100px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .tips-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    }
    @media (max-width: 768px) {
      .greeting-section { margin-bottom: 2rem; }
      .greeting-section h1 { font-size: 2.2rem; line-height: 1.05; }
      .stats-row, .actions-grid { grid-template-columns: 1fr; gap: 1rem; }
      .action-card { flex-direction: column; align-items: flex-start; }
      .arrow { margin-left: 0; }
      .tips-card { padding: 1.5rem; }
    }
  `]
})
export class DashboardComponent {
  user$ = this.authService.currentUser$;
  stats$: Observable<DashboardStats>;

  constructor(
    private authService: AuthService,
    private reportService: ReportService
  ) {
    this.stats$ = this.reportService.getDashboardStats();
  }

  canCreateOrder() {
    const user = this.authService.currentUserValue;
    return ['ADMIN', 'PURCHASE_OFFICER'].includes(user?.role || '');
  }
}
