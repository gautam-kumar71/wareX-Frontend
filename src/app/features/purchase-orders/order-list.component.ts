import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { OrderService, PurchaseOrder } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ServiceUnavailableComponent],
  template: `
    <section class="orders-hero mb-5">
      <div class="header">
        <div class="title-group">
          <span class="hero-kicker">Procurement Desk</span>
          <h2>Purchase Orders</h2>
          <p class="subtitle">Manage your orders and vendor history</p>
        </div>
        <button *ngIf="canCreateOrders()" class="btn btn-primary hero-action" [disabled]="serviceError" routerLink="/purchase-orders/new">Create Order</button>
      </div>
      <div class="hero-strip" *ngIf="!serviceError">
        <div class="hero-metric">
          <span class="hero-label">Orders In View</span>
          <strong>{{ orders.length }}</strong>
        </div>
        <div class="hero-metric">
          <span class="hero-label">Approved Flow</span>
          <strong>{{ approvedOrdersCount }}</strong>
        </div>
        <div class="hero-metric">
          <span class="hero-label">Receiving Now</span>
          <strong>{{ receivingOrdersCount }}</strong>
        </div>
      </div>
    </section>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="table-card desktop-table">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Vendor</th>
              <th>Total Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Priority</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders" class="order-row" [routerLink]="['/purchase-orders', order.id]">
              <td class="order-id-cell"><code class="order-id-chip">{{ order.orderNumber }}</code></td>
              <td class="vendor-cell"><strong>{{ order.supplierName }}</strong></td>
              <td class="amount-cell">{{ order.totalAmount | currency:'INR':'symbol':'1.2-2' }}</td>
              <td class="date-cell text-muted">{{ order.createdAt | date:'mediumDate' }}</td>
              <td>
                <span class="badge status-badge" [ngClass]="order.status.toLowerCase()">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td>
                <span class="priority-pill" [ngClass]="priorityClass(order.status)">
                  {{ priorityLabel(order.status) }}
                </span>
              </td>
              <td class="text-right">
                <div class="actions">
                  <button class="icon-btn" title="View Details">👁️</button>
                  <button class="icon-btn" title="Print Order">🖨️</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="orders.length === 0 && !loading">
              <td colspan="7" class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No orders found in this period.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="order-stack mobile-stack" *ngIf="orders.length > 0">
        <article class="order-card" *ngFor="let order of orders" [routerLink]="['/purchase-orders', order.id]">
          <div class="order-card-head">
            <div class="order-head-copy">
              <code class="order-id-chip">{{ order.orderNumber }}</code>
              <span class="priority-pill" [ngClass]="priorityClass(order.status)">{{ priorityLabel(order.status) }}</span>
            </div>
            <span class="badge status-badge" [ngClass]="order.status.toLowerCase()">
              {{ statusLabel(order.status) }}
            </span>
          </div>
          <div class="order-card-grid">
            <div class="order-field">
              <span class="field-label">Vendor</span>
              <strong>{{ order.supplierName }}</strong>
            </div>
            <div class="order-field">
              <span class="field-label">Amount</span>
              <strong>{{ order.totalAmount | currency:'INR':'symbol':'1.2-2' }}</strong>
            </div>
            <div class="order-field">
              <span class="field-label">Date</span>
              <strong>{{ order.createdAt | date:'mediumDate' }}</strong>
            </div>
          </div>
          <div class="order-card-actions">
            <button class="icon-btn" type="button" title="View Details">👁️</button>
            <button class="icon-btn" type="button" title="Print Order">🖨️</button>
          </div>
        </article>
      </div>

      <div class="mobile-empty-state mobile-stack" *ngIf="orders.length === 0 && !loading">
        <div class="empty-icon">[ ]</div>
        <p>No orders found in this period.</p>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button [disabled]="currentPage === 0" (click)="changePage(currentPage - 1)" class="btn btn-outline">Previous</button>
        <span class="page-info">Page {{ currentPage + 1 }} of {{ totalPages }}</span>
        <button [disabled]="currentPage === totalPages - 1" (click)="changePage(currentPage + 1)" class="btn btn-outline">Next</button>
      </div>
    </ng-container>

    <ng-template #errorState>
      <app-service-unavailable 
        serviceName="Order Service" 
        (retry)="loadOrders()">
      </app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .orders-hero { position: relative; padding: 1.35rem 1.4rem 1.1rem; border: 1px solid rgba(143, 216, 255, 0.08); border-radius: 24px; background:
      radial-gradient(circle at top left, rgba(143, 216, 255, 0.12), transparent 26%),
      radial-gradient(circle at right center, rgba(242, 198, 109, 0.08), transparent 24%),
      linear-gradient(180deg, rgba(15,15,15,0.98), rgba(9,9,9,0.98)); box-shadow: 0 24px 48px rgba(0,0,0,0.28); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; }
    .title-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .hero-kicker { display: inline-flex; margin-bottom: 0.6rem; padding: 0.35rem 0.7rem; border-radius: 999px; background: rgba(143, 216, 255, 0.12); color: var(--text-cool); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(143, 216, 255, 0.15); }
    .title-group h2 { font-size: clamp(1.75rem, 2.5vw, 2rem); font-weight: 900; color: white; margin: 0; letter-spacing: -0.03em; }
    .subtitle { color: var(--text-soft); font-size: 1rem; font-weight: 700; margin: 0; max-width: 36rem; }
    .hero-action { min-width: 11rem; box-shadow: 0 14px 26px rgba(74,124,68,0.24); }
    .hero-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.9rem; margin-top: 1.2rem; }
    .hero-metric { padding: 0.95rem 1rem; border-radius: 18px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
    .hero-label { display: block; margin-bottom: 0.35rem; color: var(--text-warm); font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .hero-metric strong { font-size: 1.55rem; color: white; }
    
    .table-card { background: transparent; border: none; padding: 0; overflow: hidden; }
    .desktop-table { display: block; }
    .mobile-stack { display: none; }
    .order-stack { gap: 1rem; }
    .order-card { background: linear-gradient(180deg, rgba(18,18,18,0.98), rgba(12,12,12,0.98)); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 1rem; cursor: pointer; box-shadow: 0 16px 26px rgba(0,0,0,0.22); transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
    .order-card:hover { transform: translateY(-2px); border-color: rgba(143, 216, 255, 0.14); box-shadow: 0 20px 34px rgba(0,0,0,0.3); }
    .order-card-head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.9rem; }
    .order-head-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 0.65rem; }
    .order-card-grid { display: grid; grid-template-columns: 1fr; gap: 0.8rem; margin-bottom: 0.9rem; }
    .order-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .field-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .order-card-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    
    .actions { display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; }
    .icon-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: var(--text-warm); cursor: pointer; font-size: 0.85rem; padding: 0.6rem; border-radius: 12px; transition: all 0.2s; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.01); }
    .icon-btn:hover { background: rgba(255, 255, 255, 0.07); color: white; border-color: rgba(143, 216, 255, 0.18); }
    
    .mobile-empty-state { text-align: center; padding: 2.5rem 1.25rem; background: #111; border: 1px solid var(--border); border-radius: 18px; color: #334155; }
    .empty-state { text-align: center; padding: 6rem 2rem !important; color: #334155; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 1.5rem; opacity: 0.1; }

    code { display: inline-flex; align-items: center; max-width: 100%; background: linear-gradient(180deg, rgba(74,124,68,0.2), rgba(74,124,68,0.08)); color: var(--text-accent); padding: 0.35rem 0.65rem; border-radius: 9px; font-weight: 800; font-size: 0.88rem; border: 1px solid rgba(74,124,68,0.16); white-space: nowrap; }
    .order-id-cell { white-space: normal; min-width: 0; }
    .order-id-chip { display: inline-block; max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: break-word; line-height: 1.3; }
    .vendor-cell strong { display: inline-block; max-width: 100%; white-space: normal; overflow-wrap: break-word; word-break: normal; }
    .amount-cell { font-weight: 800; color: #ffffff; font-size: 1rem; white-space: nowrap; }
    .date-cell { white-space: nowrap; }
    .priority-pill { display: inline-flex; align-items: center; justify-content: center; padding: 0.32rem 0.72rem; border-radius: 999px; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid transparent; white-space: normal; text-align: center; }
    .priority-pill.high { background: rgba(239,68,68,0.12); color: #fda4af; border-color: rgba(239,68,68,0.14); }
    .priority-pill.medium { background: rgba(245,158,11,0.12); color: #fcd34d; border-color: rgba(245,158,11,0.14); }
    .priority-pill.low { background: rgba(56,189,248,0.12); color: var(--text-cool); border-color: rgba(56,189,248,0.14); }
    .status-badge.received { background: rgba(34,197,94,0.12); color: #7ef0a6; border: 1px solid rgba(34,197,94,0.16); }
    .status-badge.partially_received { background: rgba(245,158,11,0.12); color: #ffd166; border: 1px solid rgba(245,158,11,0.16); }
    .status-badge.approved { background: rgba(59,130,246,0.12); color: #8fc7ff; border: 1px solid rgba(59,130,246,0.16); }
    .status-badge.submitted { background: rgba(168,85,247,0.12); color: #d2a7ff; border: 1px solid rgba(168,85,247,0.16); }
    .status-badge.draft { background: rgba(148,163,184,0.12); color: #c7d2fe; border: 1px solid rgba(148,163,184,0.14); }
    .status-badge.cancelled { background: rgba(239,68,68,0.12); color: #ff9a9a; border: 1px solid rgba(239,68,68,0.16); }
    .text-right { text-align: right; }

    .pagination { margin-top: 2.5rem; display: flex; justify-content: center; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .page-info { font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .order-row { cursor: pointer; }
    .order-row td { box-shadow: 0 10px 24px rgba(0,0,0,0.14); }
    .modern-table .order-row:hover td { border-color: rgba(143,216,255,0.14); }
    .modern-table { min-width: 0; width: 100%; max-width: 100%; table-layout: fixed; border-spacing: 0 12px; }
    .modern-table th,
    .modern-table td { white-space: normal; vertical-align: middle; min-width: 0; }
    .modern-table th:nth-child(1),
    .modern-table td:nth-child(1) { width: 16%; }
    .modern-table th:nth-child(2),
    .modern-table td:nth-child(2) { width: 18%; }
    .modern-table th:nth-child(3),
    .modern-table td:nth-child(3) { width: 13%; }
    .modern-table th:nth-child(4),
    .modern-table td:nth-child(4) { width: 13%; }
    .modern-table th:nth-child(5),
    .modern-table td:nth-child(5) { width: 12%; }
    .modern-table th:nth-child(6),
    .modern-table td:nth-child(6) { width: 12%; }
    .modern-table th:nth-child(7),
    .modern-table td:nth-child(7) { width: 16%; }
    .actions { flex-wrap: wrap; justify-content: flex-end; }
    .priority-pill,
    .status-badge { min-width: 0; max-width: 100%; white-space: normal; text-align: center; }
    .icon-btn { min-width: 2.35rem; min-height: 2.35rem; }
    @media (max-width: 1100px) {
      .orders-hero { padding: 1.2rem; }
      .table-card { overflow: hidden; }
      .modern-table th { padding: 0.85rem 0.75rem; font-size: 0.74rem; }
      .modern-table tr td { padding: 0.9rem 0.75rem; font-size: 0.92rem; }
      .amount-cell { font-size: 0.94rem; }
      .order-id-chip { font-size: 0.8rem; padding: 0.3rem 0.55rem; }
      .priority-pill,
      .status-badge { font-size: 0.7rem; padding-inline: 0.55rem; }
      .actions { gap: 0.35rem; }
      .icon-btn { padding: 0.5rem; border-radius: 10px; }
    }
    @media (max-width: 900px) {
      .hero-strip { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .desktop-table { display: none; }
      .mobile-stack { display: block; }
      .order-stack.mobile-stack { display: grid; }
      .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .hero-action, .header .btn { width: 100%; }
      .order-card-head { flex-direction: column; }
      .pagination { flex-direction: column; gap: 1rem; }
    }
    @media (max-width: 480px) {
      .orders-hero,
      .order-card,
      .mobile-empty-state { border-radius: 18px; }
      .order-card-actions { justify-content: stretch; }
      .order-card-actions .icon-btn { flex: 1 1 0; }
    }
  `]
})
export class OrderListComponent implements OnInit {
  orders: PurchaseOrder[] = [];
  loading = false;
  serviceError = false;
  currentPage = 0;
  totalPages = 0;

  constructor(private orderService: OrderService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(page: number = 0): void {
    this.loading = true;
    this.serviceError = false;
    this.orderService.getOrders(undefined, page).subscribe({
      next: (pageData) => {
        this.orders = pageData.content;
        this.totalPages = pageData.totalPages;
        this.currentPage = pageData.number;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.loading = false;
        if (err.status === 503 || err.status === 504 || err.status === 0) {
          this.serviceError = true;
        }
      }
    });
  }

  changePage(newPage: number): void {
    this.loadOrders(newPage);
  }

  get approvedOrdersCount(): number {
    return this.orders.filter(order => order.status === 'APPROVED').length;
  }

  get receivingOrdersCount(): number {
    return this.orders.filter(order => ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status)).length;
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  priorityLabel(status: string): string {
    if (status === 'APPROVED' || status === 'SUBMITTED') return 'High Focus';
    if (status === 'PARTIALLY_RECEIVED') return 'In Motion';
    return 'Stable';
  }

  priorityClass(status: string): string {
    if (status === 'APPROVED' || status === 'SUBMITTED') return 'high';
    if (status === 'PARTIALLY_RECEIVED') return 'medium';
    return 'low';
  }

  canCreateOrders(): boolean {
    return this.authService.canCreateOrders();
  }
}
