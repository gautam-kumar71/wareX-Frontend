import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { StockMovement } from '../../core/models/stock-movement.model';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';
import { ProductService } from '../../core/services/product.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-stock-movement-list',
  standalone: true,
  imports: [CommonModule, ServiceUnavailableComponent],
  template: `
    <div class="header mb-5">
      <div class="title-group">
        <h2>Stock History</h2>
        <p class="subtitle">See all recent inventory movements and changes</p>
      </div>
      <button class="btn btn-outline" (click)="loadMovements()">Refresh</button>
    </div>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="table-card desktop-table">
        <table class="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product / Warehouse</th>
              <th>Type</th>
              <th class="text-right">Change</th>
              <th>Stock After</th>
              <th>Reference</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let move of movements">
              <td class="trace-cell"><code>{{ move.eventId | slice:0:8 }}</code></td>
              <td>
                <div class="asset-info">
                  <strong>{{ move.productName || ('Product #' + move.productId) }}</strong>
                  <span class="node-info">{{ move.warehouseName || ('Warehouse #' + move.warehouseId) }}</span>
                </div>
              </td>
              <td>
                <span class="badge" [ngClass]="getBadgeClass(move.movementType)">
                  {{ formatType(move.movementType) }}
                </span>
              </td>
              <td class="text-right">
                <strong [style.color]="move.quantityDelta > 0 ? 'var(--status-success)' : 'var(--status-error)'">
                  {{ move.quantityDelta > 0 ? '+' : '' }}{{ move.quantityDelta }}
                </strong>
              </td>
              <td style="font-weight: 700; color: white;">{{ move.quantityAfter }}</td>
              <td class="ref-cell">
                <div class="ref-line">{{ move.referenceType }}: {{ move.referenceId }}</div>
                <div *ngIf="move.transactionId" class="tx-cell">Txn: {{ move.transactionId }}</div>
              </td>
              <td class="time-cell">{{ move.occurredAt | date:'shortTime' }}</td>
            </tr>
            <tr *ngIf="movements.length === 0 && !loading">
              <td colspan="7" class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No stock movements found.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="movement-stack mobile-stack" *ngIf="movements.length > 0">
        <article class="movement-card" *ngFor="let move of movements">
          <div class="movement-card-head">
            <code class="trace-chip">{{ move.eventId | slice:0:8 }}</code>
            <span class="badge" [ngClass]="getBadgeClass(move.movementType)">
              {{ formatType(move.movementType) }}
            </span>
          </div>

          <div class="movement-title">
            <strong>{{ move.productName || ('Product #' + move.productId) }}</strong>
            <div class="node-info">{{ move.warehouseName || ('Warehouse #' + move.warehouseId) }}</div>
          </div>

          <div class="movement-grid">
            <div class="movement-field">
              <span class="field-label">Change</span>
              <strong [style.color]="move.quantityDelta > 0 ? 'var(--status-success)' : 'var(--status-error)'">
                {{ move.quantityDelta > 0 ? '+' : '' }}{{ move.quantityDelta }}
              </strong>
            </div>
            <div class="movement-field">
              <span class="field-label">Stock After</span>
              <strong>{{ move.quantityAfter }}</strong>
            </div>
            <div class="movement-field">
              <span class="field-label">Time</span>
              <strong>{{ move.occurredAt | date:'shortTime' }}</strong>
            </div>
          </div>

          <div class="movement-reference">
            <span class="field-label">Reference</span>
            <div class="ref-line">{{ move.referenceType }}: {{ move.referenceId }}</div>
            <div *ngIf="move.transactionId" class="tx-cell">Txn: {{ move.transactionId }}</div>
          </div>
        </article>
      </div>

      <div class="mobile-empty-state mobile-stack" *ngIf="movements.length === 0 && !loading">
        <div class="empty-icon">[ ]</div>
        <p>No stock movements found.</p>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button [disabled]="currentPage === 0" (click)="changePage(currentPage - 1)" class="btn btn-outline">Previous</button>
        <span class="page-info">Page {{ currentPage + 1 }} of {{ totalPages }}</span>
        <button [disabled]="currentPage >= totalPages - 1" (click)="changePage(currentPage + 1)" class="btn btn-outline">Next</button>
      </div>
    </ng-container>

    <ng-template #errorState>
      <app-service-unavailable 
        serviceName="Inventory Service" 
        (retry)="loadMovements()">
      </app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .title-group h2 { font-size: 1.5rem; font-weight: 900; color: white; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
    
    .table-card { background: transparent; border: none; padding: 0; overflow: hidden; }
    .desktop-table { display: block; }
    .mobile-stack { display: none; }
    .table-card .modern-table { min-width: 0; width: 100%; table-layout: fixed; }
    .table-card .modern-table th:nth-child(1),
    .table-card .modern-table td:nth-child(1) { width: 10%; }
    .table-card .modern-table th:nth-child(2),
    .table-card .modern-table td:nth-child(2) { width: 23%; }
    .table-card .modern-table th:nth-child(3),
    .table-card .modern-table td:nth-child(3) { width: 18%; }
    .table-card .modern-table th:nth-child(4),
    .table-card .modern-table td:nth-child(4) { width: 9%; }
    .table-card .modern-table th:nth-child(5),
    .table-card .modern-table td:nth-child(5) { width: 10%; }
    .table-card .modern-table th:nth-child(6),
    .table-card .modern-table td:nth-child(6) { width: 18%; }
    .table-card .modern-table th:nth-child(7),
    .table-card .modern-table td:nth-child(7) { width: 12%; }
    .table-card .modern-table th { white-space: nowrap; }
    .table-card .modern-table td { vertical-align: middle; }
    
    .asset-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .asset-info strong { color: white; font-size: 0.85rem; overflow-wrap: anywhere; }
    .node-info { font-size: 0.75rem; color: var(--text-muted); overflow-wrap: anywhere; }
    .movement-stack { gap: 1rem; }
    .movement-card { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; display: flex; flex-direction: column; gap: 0.9rem; }
    .movement-card-head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
    .movement-title { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .movement-title strong { color: white; overflow-wrap: break-word; word-break: normal; }
    .movement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
    .movement-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .movement-reference { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .field-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

    .trace-cell code { display: inline-flex; align-items: center; max-width: 100%; background: rgba(255,255,255,0.03); color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 6px; font-family: monospace; font-size: 0.75rem; white-space: nowrap; }
    .trace-chip { display: inline-flex; align-items: center; max-width: 100%; background: rgba(255,255,255,0.03); color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 6px; font-family: monospace; font-size: 0.75rem; white-space: normal; overflow-wrap: anywhere; }
    .ref-cell { font-size: 0.8rem; color: #475569; font-weight: 600; }
    .ref-line { overflow-wrap: anywhere; word-break: break-word; }
    .tx-cell { margin-top: 0.2rem; color: #94a3b8; font-size: 0.74rem; overflow-wrap: anywhere; word-break: break-word; }
    .time-cell { font-size: 0.95rem; font-weight: 800; color: var(--text-soft); white-space: nowrap; }
    
    .badge.in { background: rgba(63, 158, 55, 0.1); color: var(--status-success); }
    .badge.out { background: rgba(185, 28, 28, 0.1); color: var(--status-error); }
    .badge.neutral { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .table-card .badge { white-space: nowrap; display: inline-flex; }

    .empty-state { text-align: center; padding: 6rem 2rem !important; color: #334155; }
    .mobile-empty-state { text-align: center; padding: 2rem 1.1rem; background: #0f0f0f; border: 1px solid var(--border); border-radius: 14px; color: var(--text-muted); }
    .empty-icon { font-size: 2.5rem; margin-bottom: 1.5rem; opacity: 0.1; }

    .pagination { margin-top: 4rem; display: flex; justify-content: center; align-items: center; gap: 2rem; flex-wrap: wrap; }
    .page-info { font-size: 0.85rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .text-right { text-align: right; }
    @media (max-width: 1100px) {
      .table-card .modern-table th { padding: 0.85rem 0.8rem; font-size: 0.74rem; }
      .table-card .modern-table td { padding: 0.95rem 0.8rem; }
    }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; }
      .header .btn { width: 100%; }
      .desktop-table { display: none; }
      .mobile-stack { display: block; }
      .movement-stack.mobile-stack { display: grid; }
      .movement-grid { grid-template-columns: 1fr; }
      .movement-card-head { flex-direction: column; }
      .pagination { margin-top: 2rem; flex-direction: column; gap: 1rem; }
      .pagination .btn { width: 100%; }
    }
  `]
})
export class StockMovementListComponent implements OnInit {
  movements: StockMovement[] = [];
  loading = false;
  serviceError = false;
  currentPage = 0;
  pageSize = 50;
  totalPages = 0;

  constructor(
    private movementService: StockMovementService,
    private productService: ProductService,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.loading = true;
    this.serviceError = false;
    this.movementService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.movements = page.content;
        this.totalPages = page.totalPages;
        this.loading = false;
        this.enrichMovements(page.content);
      },
      error: (err) => {
        console.error('Error fetching movements:', err);
        this.loading = false;
        if (err.status === 503 || err.status === 504 || err.status === 0 || err.status === 404) {
          this.serviceError = true;
        }
      }
    });
  }

  changePage(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.currentPage = newPage;
      this.loadMovements();
    }
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  getBadgeClass(type: string): string {
    if (type.includes('IN') || type === 'RECEIPT' || type === 'ADJUSTMENT_ADD') {
      return 'in';
    } else if (type.includes('OUT') || type === 'SALE' || type === 'ADJUSTMENT_SUB') {
      return 'out';
    }
    return 'neutral';
  }

  private enrichMovements(movements: StockMovement[]): void {
    const productIds = [...new Set(
      movements
        .filter(move => !move.productName || move.productName.startsWith('Unknown Product') || move.productName.startsWith('Product #'))
        .map(move => move.productId)
    )];
    const warehouseIds = [...new Set(
      movements
        .filter(move => !move.warehouseName || move.warehouseName.startsWith('Unknown Warehouse') || move.warehouseName.startsWith('Warehouse #'))
        .map(move => move.warehouseId)
    )];

    if (productIds.length === 0 && warehouseIds.length === 0) {
      return;
    }

    const productRequests = productIds.reduce((requests, id) => ({
      ...requests,
      [id]: this.productService.getProductById(id).pipe(catchError(() => of(null)))
    }), {} as Record<number, Observable<any>>);

    const warehouseRequests = warehouseIds.reduce((requests, id) => ({
      ...requests,
      [id]: this.warehouseService.getWarehouseById(id).pipe(catchError(() => of(null)))
    }), {} as Record<number, Observable<any>>);

    forkJoin({
      products: Object.keys(productRequests).length ? forkJoin(productRequests) : of({}),
      warehouses: Object.keys(warehouseRequests).length ? forkJoin(warehouseRequests) : of({})
    }).subscribe(({ products, warehouses }) => {
      const resolvedProducts = products as Record<number, { name?: string } | null>;
      const resolvedWarehouses = warehouses as Record<number, { name?: string } | null>;

      this.movements = movements.map(move => ({
        ...move,
        productName: resolvedProducts[move.productId]?.name || move.productName,
        warehouseName: resolvedWarehouses[move.warehouseId]?.name || move.warehouseName
      }));
    });
  }
}
