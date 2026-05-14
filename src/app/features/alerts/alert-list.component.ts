import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, Alert } from '../../core/services/alert.service';
import { ProductService } from '../../core/services/product.service';
import { StockLevel, StockService } from '../../core/services/stock.service';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="alerts-page">
      <div class="header">
        <div class="title-group">
          <h2>System Alerts & Notifications</h2>
          <p class="subtitle">Track low-stock signals, operational warnings, and read status in one place.</p>
        </div>
        <div class="header-actions">
          <span class="badge summary-badge" *ngIf="unreadCount > 0">{{ unreadCount }} Unread</span>
          <button class="btn-clear-all" *ngIf="alerts.length > 0" (click)="clearAll()">Clear all</button>
        </div>
      </div>

      <div class="alert-container">
        <div *ngFor="let alert of alerts" class="alert-item" [class.unread]="!alert.read">
          <div class="alert-icon" [ngClass]="alert.type.toLowerCase()">
            <span *ngIf="alert.type === 'CRITICAL'">⚠️</span>
            <span *ngIf="alert.type === 'WARNING'">🔔</span>
            <span *ngIf="alert.type === 'INFO'">ℹ️</span>
          </div>
          <div class="alert-content">
            <p class="message">{{ alert.message }}</p>
            <span class="date">{{ alert.createdAt | date:'medium' }}</span>
          </div>
          <button *ngIf="!alert.read" class="btn-read" (click)="markAsRead(alert.id)">Mark as read</button>
        </div>

        <div *ngIf="alerts.length === 0" class="empty-state">
          <p>No alerts at this time.</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .alerts-page { display: flex; flex-direction: column; gap: 1.25rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; padding-left: 5.5rem; }
    .title-group { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
    .title-group h2 { margin: 0; font-size: clamp(1.45rem, 2.2vw, 1.9rem); font-weight: 900; letter-spacing: -0.02em; color: white; }
    .subtitle { margin: 0; max-width: 44rem; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; }
    .summary-badge { align-self: center; flex: 0 0 auto; }
    .btn-clear-all { background: transparent; border: 1px solid #333; color: #d4d4d8; padding: 0.55rem 0.9rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-clear-all:hover { border-color: #ef4444; color: #fca5a5; background: rgba(239, 68, 68, 0.08); }
    .alert-container { display: flex; flex-direction: column; gap: 1rem; }
    .alert-item { background: #171717; border: 1px solid var(--border); padding: 1.1rem 1.25rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; min-width: 0; }
    .alert-item.unread { border-left: 4px solid var(--primary); background: rgba(249, 115, 22, 0.05); }
    .alert-icon { width: 2.75rem; height: 2.75rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex: 0 0 auto; }
    .critical { background: rgba(239, 68, 68, 0.1); }
    .warning { background: rgba(251, 191, 36, 0.1); }
    .info { background: rgba(59, 130, 246, 0.1); }
    .alert-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .message { margin: 0; font-size: 1rem; font-weight: 800; color: #e5e5e5; overflow-wrap: break-word; word-break: normal; }
    .date { font-size: 0.84rem; color: #8fa1c7; margin-top: 0; display: block; }
    .btn-read { background: transparent; border: 1px solid #333; color: #d4d4d8; padding: 0.55rem 0.9rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
    .btn-read:hover { border-color: var(--primary); color: var(--primary); }
    .empty-state { text-align: center; padding: 4rem; color: #737373; border: 2px dashed #262626; border-radius: 16px; }
    @media (max-width: 900px) {
      .header { padding-left: 0; }
    }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: flex-start; }
      .header-actions { justify-content: flex-start; }
      .alert-item { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .summary-badge { align-self: flex-start; }
      .btn-clear-all { width: 100%; text-align: center; }
      .btn-read { width: 100%; text-align: center; }
      .empty-state { padding: 2rem 1rem; }
    }
  `]
})
export class AlertListComponent implements OnInit {
  alerts: Alert[] = [];
  unreadCount = 0;

  constructor(
    private alertService: AlertService,
    private productService: ProductService,
    private stockService: StockService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.alertService.getAlerts().subscribe(data => {
      this.alerts = data;
      this.unreadCount = this.alerts.filter(a => !a.read).length;
      this.enrichLegacyLowStockAlerts();
      this.reconcileLowStockAlertQuantities();
    });
  }

  markAsRead(id: number): void {
    this.alertService.markAsRead(id).subscribe(() => {
      const alert = this.alerts.find(a => a.id === id);
      if (alert) alert.read = true;
      this.unreadCount = this.alerts.filter(a => !a.read).length;
    });
  }

  clearAll(): void {
    this.alertService.clearAll().subscribe(() => {
      this.alerts = [];
      this.unreadCount = 0;
    });
  }

  private enrichLegacyLowStockAlerts(): void {
    const productIds = [...new Set(
      this.alerts
        .map(alert => this.parseLegacyLowStockMessage(alert.message)?.productId)
        .filter((id): id is number => id !== null)
    )];

    if (productIds.length === 0) {
      return;
    }

    const requests = productIds.reduce((acc, id) => ({
      ...acc,
      [id]: this.productService.getProductById(id).pipe(catchError(() => of(null)))
    }), {} as Record<number, Observable<any>>);

    forkJoin(requests).subscribe(products => {
      this.alerts = this.alerts.map(alert => {
        const parsed = this.parseLegacyLowStockMessage(alert.message);
        if (!parsed) {
          return alert;
        }

        const productName = products[parsed.productId]?.name;
        if (!productName) {
          return alert;
        }

        return {
          ...alert,
          message: `${productName} is running low. Current quantity: ${parsed.quantity}`
        };
      });
    });
  }

  private reconcileLowStockAlertQuantities(): void {
    if (!this.alerts.some(alert => this.parseLowStockAlertMessage(alert.message))) {
      return;
    }

    this.stockService.getLowStock().subscribe({
      next: (stockLevels) => {
        this.alerts = this.alerts.map(alert => {
          const parsed = this.parseLowStockAlertMessage(alert.message);
          if (!parsed) {
            return alert;
          }

          const matchingStock = this.findMatchingLowStockRow(parsed, stockLevels);
          if (!matchingStock) {
            return alert;
          }

          return {
            ...alert,
            message: this.buildResolvedLowStockMessage(parsed, matchingStock)
          };
        });
      },
      error: () => {
        // Best-effort UI correction only; keep persisted message if lookup fails.
      }
    });
  }

  private parseLegacyLowStockMessage(message: string): { productId: number; quantity: number } | null {
    const match = /^Product ID (\d+) is running low\. Current quantity: (\d+)$/i.exec(message.trim());
    if (!match) {
      return null;
    }

    return {
      productId: Number(match[1]),
      quantity: Number(match[2])
    };
  }

  private parseLowStockAlertMessage(message: string): {
    productId?: number;
    productName: string;
    warehouseName?: string;
    quantity: number;
  } | null {
    const trimmedMessage = message.trim();
    const legacy = this.parseLegacyLowStockMessage(trimmedMessage);
    if (legacy) {
      return {
        productId: legacy.productId,
        productName: `Product #${legacy.productId}`,
        quantity: legacy.quantity
      };
    }

    const match = /^(.*?) is running low(?: in (.*?))?\. Current quantity: (-?\d+)$/i.exec(trimmedMessage);
    if (!match) {
      return null;
    }

    return {
      productName: match[1].trim(),
      warehouseName: match[2]?.trim() || undefined,
      quantity: Number(match[3])
    };
  }

  private findMatchingLowStockRow(
    parsed: { productId?: number; productName: string; warehouseName?: string; quantity: number },
    stockLevels: StockLevel[]
  ): StockLevel | undefined {
    const normalizedProductName = parsed.productName.trim().toLowerCase();
    const normalizedWarehouseName = parsed.warehouseName?.trim().toLowerCase();

    if (parsed.productId != null) {
      const byId = stockLevels.filter(level => level.productId === parsed.productId);
      if (normalizedWarehouseName) {
        return byId.find(level => level.warehouseName?.trim().toLowerCase() === normalizedWarehouseName);
      }
      return byId.length === 1 ? byId[0] : undefined;
    }

    return stockLevels.find(level =>
      (level.productName || `Product #${level.productId}`).trim().toLowerCase() === normalizedProductName
      && (!normalizedWarehouseName || level.warehouseName?.trim().toLowerCase() === normalizedWarehouseName)
    );
  }

  private buildResolvedLowStockMessage(
    parsed: { productId?: number; productName: string; warehouseName?: string; quantity: number },
    stockLevel: StockLevel
  ): string {
    const productName = stockLevel.productName || parsed.productName || `Product #${stockLevel.productId}`;
    const warehouseName = stockLevel.warehouseName || parsed.warehouseName;
    const quantity = stockLevel.quantity;

    if (warehouseName) {
      return `${productName} is running low in ${warehouseName}. Current quantity: ${quantity}`;
    }

    return `${productName} is running low. Current quantity: ${quantity}`;
  }
}
