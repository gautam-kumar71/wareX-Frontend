import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Warehouse, WarehouseService } from '../../core/services/warehouse.service';
import { StockLevel, StockService, TransferStockPayload } from '../../core/services/stock.service';
import { OrderService, PurchaseOrder } from '../../core/services/order.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [CommonModule, ServiceUnavailableComponent, RouterLink, ReactiveFormsModule],
  template: `
    <div class="header mb-5">
      <div class="title-group">
        <h2>Warehouses</h2>
        <p class="subtitle">Capacity, low-stock pressure, and transfer guidance across active storage locations</p>
      </div>
      <button *ngIf="canManageWarehouses()" class="btn btn-primary" [disabled]="serviceError" routerLink="/warehouses/new">Add Warehouse</button>
    </div>

    <div class="summary-grid" *ngIf="!serviceError">
      <div class="summary-card">
        <span class="summary-label">Active Warehouses</span>
        <strong>{{ activeWarehouseCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Low Stock Nodes</span>
        <strong>{{ lowStockWarehouseCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Capacity Risk</span>
        <strong>{{ highCapacityWarehouseCount }}</strong>
      </div>
    </div>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="warehouse-stack" *ngIf="warehouses.length > 0">
        <article class="warehouse-card" *ngFor="let wh of warehouses">
          <div class="warehouse-card-head">
            <div>
              <strong class="warehouse-name">{{ wh.name }}</strong>
              <div class="text-muted">{{ wh.city }}, {{ wh.country }}</div>
            </div>
            <span class="badge" [ngClass]="wh.active ? 'approved' : 'cancelled'">
              {{ wh.active ? 'Active' : 'Inactive' }}
            </span>
          </div>

          <div class="warehouse-card-grid">
            <div class="warehouse-field">
              <span class="field-label">Operations</span>
              <strong>{{ wh.location }}</strong>
              <span class="text-muted">{{ wh.managerName || 'Manager not set' }}<span *ngIf="wh.contactPhone"> • {{ wh.contactPhone }}</span></span>
            </div>

            <div class="warehouse-field" *ngIf="wh.totalStorageCapacity; else mobileNoCap">
              <span class="field-label">Capacity</span>
              <div class="capacity-label-row">
                <span>{{ wh.currentCapacityUtilization || 0 }} / {{ wh.totalStorageCapacity }}</span>
                <span>{{ wh.capacityPercent ?? getCapacityPercent(wh) }}%</span>
              </div>
              <div class="capacity-bar-container" [title]="(wh.currentCapacityUtilization || 0) + ' / ' + wh.totalStorageCapacity">
                <div class="capacity-bar"
                     [style.width.%]="wh.capacityPercent ?? getCapacityPercent(wh)"
                     [ngClass]="getCapacityClass(wh)">
                </div>
              </div>
              <div class="capacity-advisory" *ngIf="wh.capacityAdvisory">{{ wh.capacityAdvisory }}</div>
              <div class="transfer-hint" *ngIf="wh.suggestedTransferWarehouseName">
                Suggested transfer target: {{ wh.suggestedTransferWarehouseName }}
                <span *ngIf="wh.suggestedTransferFreeCapacity !== undefined">({{ wh.suggestedTransferFreeCapacity }} free)</span>
              </div>
            </div>
            <ng-template #mobileNoCap>
              <div class="warehouse-field">
                <span class="field-label">Capacity</span>
                <span class="text-muted">Not set</span>
              </div>
            </ng-template>

            <div class="warehouse-field">
              <span class="field-label">Reorder Signals</span>
              <div class="signal-stack">
                <span class="signal-chip signal-inbound" *ngIf="(openInboundOrderCounts[wh.id || 0] || 0) > 0">
                  {{ openInboundOrderCounts[wh.id || 0] }} inbound order{{ (openInboundOrderCounts[wh.id || 0] || 0) > 1 ? 's' : '' }}
                </span>
                <span class="signal-chip signal-low" *ngIf="(wh.lowStockItemCount || 0) > 0">
                  {{ wh.lowStockItemCount }} low-stock SKU{{ (wh.lowStockItemCount || 0) > 1 ? 's' : '' }}
                </span>
                <span class="signal-chip signal-over" *ngIf="(wh.overstockItemCount || 0) > 0">
                  {{ wh.overstockItemCount }} over-cap SKU{{ (wh.overstockItemCount || 0) > 1 ? 's' : '' }}
                </span>
                <div class="text-muted" *ngIf="latestInboundOrderNumbers[wh.id || 0]">
                  Latest inbound PO: {{ latestInboundOrderNumbers[wh.id || 0] }}
                </div>
                <div class="signal-idle" *ngIf="(openInboundOrderCounts[wh.id || 0] || 0) === 0 && (wh.lowStockItemCount || 0) === 0 && (wh.overstockItemCount || 0) === 0">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>No active reorder alerts</span>
                </div>
              </div>
            </div>
          </div>

          <div class="warehouse-actions">
            <a *ngIf="canManageWarehouses()" [routerLink]="['/warehouses', wh.id, 'edit']" class="btn btn-outline btn-sm">Manage</a>
            <button class="btn btn-outline btn-sm" *ngIf="wh.active" (click)="openTransferPlanner(wh)">Rebalance</button>
            <a routerLink="/stock-movements" class="btn btn-outline btn-sm" *ngIf="wh.suggestedTransferWarehouseName || (wh.lowStockItemCount || 0) > 0">History</a>
          </div>
        </article>
      </div>

      <div class="mobile-empty-state" *ngIf="warehouses.length === 0 && !loading">
        <div class="empty-icon">[ ]</div>
        <p>No warehouses found.</p>
      </div>
    </ng-container>

    <div class="modal-backdrop" *ngIf="transferDialogOpen" (click)="closeTransferDialog()">
      <div class="modal-card transfer-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>Rebalance Stock</h3>
            <p>{{ transferSourceWarehouse?.name }}<span *ngIf="transferSourceWarehouse?.capacityAdvisory"> • {{ transferSourceWarehouse?.capacityAdvisory }}</span></p>
          </div>
          <button class="icon-btn" (click)="closeTransferDialog()">×</button>
        </div>

        <div class="planner-loading" *ngIf="transferLoading && transferCandidates.length === 0">
          Loading stock candidates...
        </div>

        <form [formGroup]="transferForm" (ngSubmit)="submitTransfer()" *ngIf="transferSourceWarehouse">
          <div class="planner-grid">
            <div class="candidate-panel">
              <div class="panel-title">Products You Can Move</div>
              <button
                type="button"
                class="candidate-row"
                *ngFor="let stock of transferCandidates"
                [class.selected]="transferForm.get('productId')?.value === stock.productId"
                (click)="selectTransferCandidate(stock)">
                <div>
                  <strong>{{ stock.productName || ('Product #' + stock.productId) }}</strong>
                  <div class="text-muted">{{ stock.sku || 'SKU unavailable' }}</div>
                </div>
                <div class="candidate-metrics">
                  <span>{{ stock.availableQty }} free</span>
                  <span *ngIf="stock.maxCapacity">Cap {{ stock.quantity }}/{{ stock.maxCapacity }}</span>
                  <span *ngIf="stock.reorderPoint">Reorder {{ stock.reorderPoint }}</span>
                </div>
              </button>
              <div class="empty-hint" *ngIf="!transferLoading && transferCandidates.length === 0">
                {{ transferCandidateEmptyMessage }}
              </div>
            </div>

            <div class="transfer-panel">
              <div class="panel-title">Transfer Details</div>

              <label>Destination Warehouse</label>
              <select formControlName="destinationWarehouseId" class="form-control">
                <option [ngValue]="null">Select destination</option>
                <option *ngFor="let wh of transferDestinations" [ngValue]="wh.id">
                  {{ wh.name }}{{ estimateFreeCapacity(wh) !== null ? (' • ' + estimateFreeCapacity(wh) + ' free') : '' }}
                </option>
              </select>

              <label>Selected Product</label>
              <div class="selection-card" *ngIf="selectedTransferCandidate; else noSelection">
                <strong>{{ selectedTransferCandidate.productName || ('Product #' + selectedTransferCandidate.productId) }}</strong>
                <div class="text-muted">
                  SKU: {{ selectedTransferCandidate.sku || 'Unavailable' }} • Available {{ selectedTransferCandidate.availableQty }}
                </div>
                <div class="helper-row">
                  <span *ngIf="selectedTransferCandidate.overstock" class="signal-chip signal-over">Above max capacity</span>
                  <span *ngIf="selectedTransferCandidate.lowStock" class="signal-chip signal-low">Near reorder point</span>
                </div>
              </div>
              <ng-template #noSelection>
                <div class="selection-card muted">Choose a product on the left to prepare the transfer.</div>
              </ng-template>

              <label>Transfer Quantity</label>
              <input type="number" formControlName="quantity" class="form-control" min="1" [max]="selectedTransferCandidate?.availableQty || null">

              <label>Reference</label>
              <input type="text" formControlName="referenceId" class="form-control" placeholder="Optional internal transfer note">

              <div class="transfer-guidance" *ngIf="selectedDestinationWarehouse">
                {{ selectedDestinationWarehouse.name }} has
                {{ selectedDestinationWarehouse.suggestedTransferFreeCapacity ?? estimateFreeCapacity(selectedDestinationWarehouse) }}
                tracked free capacity.
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeTransferDialog()">Close</button>
            <button type="submit" class="btn btn-primary" [disabled]="transferForm.invalid || transferring || !selectedTransferCandidate">
              {{ transferring ? 'Transferring...' : 'Transfer Stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ng-template #errorState>
      <app-service-unavailable 
        serviceName="Warehouse Service" 
        (retry)="loadWarehouses()">
      </app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .title-group h2 { font-size: 1.5rem; font-weight: 900; color: white; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; margin: 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { background: #111; border: 1px solid var(--border); border-radius: 16px; padding: 1rem 1.25rem; }
    .summary-label { display: block; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.45rem; }
    .summary-card strong { font-size: 1.45rem; color: white; }
    .warehouse-stack { display: grid; gap: 1rem; }
    .warehouse-card { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; }
    .warehouse-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem; margin-bottom: 1rem; }
    .warehouse-name { display: block; font-size: 1.05rem; color: white; margin-bottom: 0.25rem; }
    .warehouse-card-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 0.95fr); gap: 1rem; margin-bottom: 1rem; align-items: start; }
    .warehouse-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .field-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .empty-state { text-align: center; padding: 6rem 2rem !important; color: var(--text-muted); }
    .mobile-empty-state { text-align: center; padding: 2.5rem 1.25rem; background: #111; border: 1px solid var(--border); border-radius: 18px; color: var(--text-muted); }
    .empty-icon { font-size: 2.5rem; margin-bottom: 1.5rem; opacity: 0.1; }
    .text-right { text-align: right; }
    .capacity-label-row { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.82rem; color: #d4d4d4; margin-bottom: 0.35rem; }
    .capacity-bar-container { width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin-top: 5px; }
    .capacity-bar { height: 100%; transition: width 0.3s ease; }
    .cap-safe { background: var(--primary); }
    .cap-warn { background: #F59E0B; }
    .cap-danger { background: #EF4444; }
    .capacity-advisory { margin-top: 0.6rem; color: #d4d4d4; font-size: 0.82rem; line-height: 1.4; }
    .transfer-hint { margin-top: 0.4rem; color: #93c5fd; font-size: 0.8rem; }
    .signal-stack { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .signal-chip { display: inline-flex; align-items: center; padding: 0.3rem 0.55rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
    .signal-inbound { background: rgba(59, 130, 246, 0.14); border: 1px solid rgba(59, 130, 246, 0.25); color: #93c5fd; }
    .signal-low { background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; }
    .signal-over { background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; }
    .signal-idle { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.7rem; border-radius: 999px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.16); color: #9ae6b4; font-size: 0.78rem; font-weight: 700; }
    .signal-idle svg { width: 0.9rem; height: 0.9rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
    .warehouse-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 1.5rem; z-index: 50; }
    .modal-card { width: min(980px, 100%); background: #101010; border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; box-shadow: 0 30px 80px rgba(0,0,0,0.45); }
    .modal-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .modal-header h3 { margin: 0; font-size: 1.25rem; }
    .modal-header p { margin: 0.35rem 0 0; color: var(--text-muted); }
    .icon-btn { width: 2rem; height: 2rem; border-radius: 999px; border: 1px solid var(--border); background: #171717; color: white; cursor: pointer; }
    .planner-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; }
    .candidate-panel, .transfer-panel { background: #141414; border: 1px solid var(--border); border-radius: 16px; padding: 1rem; }
    .panel-title { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.85rem; }
    .candidate-row { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; text-align: left; background: #0f0f0f; border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; color: white; margin-bottom: 0.65rem; cursor: pointer; }
    .candidate-row.selected { border-color: var(--primary); box-shadow: 0 0 0 1px rgba(122, 183, 109, 0.3) inset; }
    .candidate-metrics { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end; color: var(--text-muted); font-size: 0.8rem; }
    .form-control { width: 100%; background: #0a0a0a; border: 1px solid var(--border); color: white; border-radius: 10px; padding: 0.75rem; margin: 0.35rem 0 0.85rem; }
    .transfer-panel label { display: block; font-size: 0.85rem; color: #d4d4d4; font-weight: 600; }
    .selection-card { background: #0f0f0f; border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; margin: 0.35rem 0 0.85rem; }
    .selection-card.muted { color: var(--text-muted); }
    .helper-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.6rem; }
    .transfer-guidance { color: #93c5fd; font-size: 0.82rem; margin-top: 0.15rem; }
    .planner-loading, .empty-hint { color: var(--text-muted); padding: 1rem 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
    @media (max-width: 1200px) {
      .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .warehouse-card-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 960px) {
      .planner-grid { grid-template-columns: 1fr; }
      .summary-grid { grid-template-columns: 1fr; }
      .header .btn { width: 100%; }
      .warehouse-card-head { flex-direction: column; }
      .warehouse-card-grid { grid-template-columns: 1fr; }
      .warehouse-actions .btn { width: 100%; }
    }
  `]
})
export class WarehouseListComponent implements OnInit {
  warehouses: Warehouse[] = [];
  loading = false;
  serviceError = false;
  transferDialogOpen = false;
  transferLoading = false;
  transferring = false;
  transferSourceWarehouse?: Warehouse;
  transferCandidates: StockLevel[] = [];
  transferSourceStockRows = 0;
  transferDestinations: Warehouse[] = [];
  selectedTransferCandidate?: StockLevel;
  openInboundOrderCounts: Record<number, number> = {};
  latestInboundOrderNumbers: Record<number, string> = {};
  transferForm: FormGroup;

  constructor(
    private warehouseService: WarehouseService,
    private stockService: StockService,
    private orderService: OrderService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.transferForm = this.fb.group({
      productId: [null, Validators.required],
      destinationWarehouseId: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      referenceId: ['']
    });
  }

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loading = true;
    this.serviceError = false;
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        this.loadInboundOrders(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching warehouses:', err);
        this.loading = false;
        if (err.status === 503 || err.status === 504 || err.status === 0) {
          this.serviceError = true;
        }
      }
    });
  }

  private loadInboundOrders(warehouses: Warehouse[]): void {
    const activeWarehouseIds = warehouses
      .map(wh => wh.id)
      .filter((id): id is number => id !== undefined);

    if (activeWarehouseIds.length === 0) {
      this.openInboundOrderCounts = {};
      this.latestInboundOrderNumbers = {};
      return;
    }

    const requests = activeWarehouseIds.map(id =>
      this.orderService.getOrders(undefined, 0, 50, id).pipe(
        map(page => ({
          warehouseId: id,
          orders: page.content.filter(order => this.isInboundOrder(order))
        }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.openInboundOrderCounts = results.reduce<Record<number, number>>((acc, result) => {
          acc[result.warehouseId] = result.orders.length;
          return acc;
        }, {});
        this.latestInboundOrderNumbers = results.reduce<Record<number, string>>((acc, result) => {
          if (result.orders.length > 0) {
            acc[result.warehouseId] = result.orders[0].orderNumber;
          }
          return acc;
        }, {});
      },
      error: () => {
        this.openInboundOrderCounts = {};
        this.latestInboundOrderNumbers = {};
      }
    });
  }

  private isInboundOrder(order: PurchaseOrder): boolean {
    return ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status);
  }

  canManageWarehouses(): boolean {
    return this.authService.canManageWarehouses();
  }

  getCapacityPercent(wh: Warehouse): number {
    if (!wh.totalStorageCapacity) return 0;
    const used = wh.currentCapacityUtilization || 0;
    return Math.min(100, Math.round((used / wh.totalStorageCapacity) * 100));
  }

  getCapacityClass(wh: Warehouse): string {
    const pct = wh.capacityPercent ?? this.getCapacityPercent(wh);
    if (pct >= 90) return 'cap-danger';
    if (pct >= 75) return 'cap-warn';
    return 'cap-safe';
  }

  get activeWarehouseCount(): number {
    return this.warehouses.filter(wh => wh.active).length;
  }

  get lowStockWarehouseCount(): number {
    return this.warehouses.filter(wh => (wh.lowStockItemCount || 0) > 0).length;
  }

  get highCapacityWarehouseCount(): number {
    return this.warehouses.filter(wh => (wh.capacityPercent ?? this.getCapacityPercent(wh)) >= 85).length;
  }

  openTransferPlanner(warehouse: Warehouse): void {
    if (!warehouse.id) {
      return;
    }

    this.transferDialogOpen = true;
    this.transferLoading = true;
    this.transferSourceWarehouse = warehouse;
    this.transferCandidates = [];
    this.transferSourceStockRows = 0;
    this.selectedTransferCandidate = undefined;
    this.transferDestinations = this.warehouses.filter(wh => wh.active && wh.id !== warehouse.id);

    const defaultDestination = warehouse.suggestedTransferWarehouseId ?? this.transferDestinations[0]?.id ?? null;
    this.transferForm.reset({
      productId: null,
      destinationWarehouseId: defaultDestination,
      quantity: null,
      referenceId: ''
    });

    this.stockService.getStockByWarehouse(warehouse.id).subscribe({
      next: (stock) => {
        this.transferSourceStockRows = stock.length;
        this.transferCandidates = stock
          .filter(item => item.availableQty > 0)
          .sort((a, b) => {
            if (a.overstock !== b.overstock) return Number(b.overstock) - Number(a.overstock);
            return b.availableQty - a.availableQty;
          });

        if (this.transferCandidates.length > 0) {
          this.selectTransferCandidate(this.transferCandidates[0]);
        }
        this.transferLoading = false;
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to load transferable stock');
        this.transferLoading = false;
        this.closeTransferDialog();
      }
    });
  }

  closeTransferDialog(): void {
    this.transferDialogOpen = false;
    this.transferLoading = false;
    this.transferring = false;
    this.transferSourceWarehouse = undefined;
    this.transferCandidates = [];
    this.transferSourceStockRows = 0;
    this.transferDestinations = [];
    this.selectedTransferCandidate = undefined;
  }

  selectTransferCandidate(stock: StockLevel): void {
    this.selectedTransferCandidate = stock;
    const suggestedQty = stock.overstock && stock.maxCapacity
      ? Math.min(stock.availableQty, Math.max(1, stock.quantity - stock.maxCapacity))
      : Math.min(stock.availableQty, Math.max(1, Math.ceil(stock.availableQty / 2)));

    this.transferForm.patchValue({
      productId: stock.productId,
      quantity: suggestedQty
    });
  }

  submitTransfer(): void {
    if (!this.transferSourceWarehouse?.id || !this.selectedTransferCandidate || this.transferForm.invalid) {
      return;
    }

    const destinationWarehouseId = Number(this.transferForm.value.destinationWarehouseId);
    const quantity = Number(this.transferForm.value.quantity);

    if (!destinationWarehouseId) {
      this.toastService.error('Choose a destination warehouse before transferring');
      return;
    }
    if (quantity > this.selectedTransferCandidate.availableQty) {
      this.toastService.error('Transfer quantity cannot be greater than the available stock');
      return;
    }

    const payload: TransferStockPayload = {
      productId: this.transferForm.value.productId,
      sourceWarehouseId: this.transferSourceWarehouse.id,
      destinationWarehouseId,
      quantity,
      referenceId: this.transferForm.value.referenceId || undefined
    };

    this.transferring = true;
    this.stockService.transferStock(payload).subscribe({
      next: () => {
        this.toastService.success('Stock transferred successfully');
        this.transferring = false;
        this.closeTransferDialog();
        this.loadWarehouses();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to transfer stock');
        this.transferring = false;
      }
    });
  }

  estimateFreeCapacity(warehouse: Warehouse): number | null {
    if (!warehouse.totalStorageCapacity) {
      return null;
    }
    return Math.max(0, warehouse.totalStorageCapacity - (warehouse.currentCapacityUtilization || 0));
  }

  get selectedDestinationWarehouse(): Warehouse | undefined {
    return this.transferDestinations.find(wh => wh.id === this.transferForm.get('destinationWarehouseId')?.value);
  }

  get transferCandidateEmptyMessage(): string {
    if (this.transferSourceStockRows === 0) {
      return 'No stock rows exist in this warehouse yet.';
    }
    return 'No movable stock is available here right now. Only available quantity, not reserved quantity, can be transferred.';
  }
}
