import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, PurchaseOrder } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService, SystemRole } from '../../core/services/auth.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { InvoiceService } from '../../core/services/invoice.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-4" *ngIf="order; else loading">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="mb-1">{{ order.orderNumber }}</h2>
          <span class="badge" [ngClass]="getStatusClass(order.status)">{{ order.status }}</span>
        </div>
        <div class="actions">
          <button class="btn btn-outline-secondary me-2" routerLink="/purchase-orders">Back to List</button>
          
          <!-- Actions based on status and roles -->
          <button *ngIf="canSubmitOrder()" 
                  class="btn btn-primary me-2" (click)="onAction('submit')">Submit for Approval</button>
          
          <button *ngIf="canApproveOrder()" 
                  class="btn btn-success me-2" (click)="onAction('approve')">Approve Order</button>
          
          <button *ngIf="canCancelOrder()" class="btn btn-outline-danger me-2" (click)="promptCancel()">Cancel Order</button>
          
          <button *ngIf="canReceiveStock()" 
                  class="btn btn-info"
                  [disabled]="!isInvoicePaidForReceipt()"
                  (click)="openReceiveDialog()">Receive Stock</button>
        </div>
      </div>

      <div class="row">
        <div class="col-md-8">
          <div class="card p-4 mb-4">
            <h4>Order Items</h4>
            <div class="table-responsive">
              <table class="table table-dark mt-3">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th class="text-end">Qty</th>
                    <th class="text-end">Price</th>
                    <th class="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of order.lines">
                    <td>{{ line.productName }}</td>
                    <td><code>{{ line.productSku }}</code></td>
                    <td class="text-end">{{ line.orderedQty }}</td>
                    <td class="text-end">{{ line.unitPrice | currency:'INR':'symbol':'1.2-2' }}</td>
                    <td class="text-end">{{ line.orderedQty * line.unitPrice | currency:'INR':'symbol':'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card p-4 mb-4 shadow-sm">
            <h5>Summary</h5>
            <div class="d-flex justify-content-between my-2">
              <span class="text-muted">Supplier:</span>
              <span class="fw-bold">{{ order.supplierName }}</span>
            </div>
            <div class="d-flex justify-content-between my-2">
              <span class="text-muted">Total Amount:</span>
              <span class="fw-bold text-primary fs-4">{{ order.totalAmount | currency:'INR':'symbol':'1.2-2' }}</span>
            </div>
            <div class="d-flex justify-content-between my-2">
              <span class="text-muted">Warehouse:</span>
              <span class="fw-bold">{{ warehouseName || ('Warehouse #' + order.warehouseId) }}</span>
            </div>
            <div class="d-flex justify-content-between my-2">
              <span class="text-muted">Invoice Status:</span>
              <span class="fw-bold">{{ invoiceStatus || 'Unknown' }}</span>
            </div>
            <small class="text-muted d-block" *ngIf="!isInvoicePaidForReceipt()">
              Stock can be received only after the linked invoice is paid.
            </small>
            <hr>
            <div class="d-flex justify-content-between my-2">
              <span class="text-muted">Created:</span>
              <span>{{ order.createdAt | date:'short' }}</span>
            </div>
          </div>

          <div class="card p-4" *ngIf="order.notes">
            <h5>Notes</h5>
            <p class="mb-0 text-muted small">{{ order.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="receiveDialogOpen" (click)="closeReceiveDialog()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>Receive Stock</h3>
            <p>{{ order?.orderNumber }}</p>
          </div>
          <button class="icon-btn" (click)="closeReceiveDialog()">×</button>
        </div>

        <div class="receive-list" *ngIf="order">
          <div class="receive-row" *ngFor="let line of receivableLines()">
            <div>
              <strong>{{ line.productName }}</strong>
              <div class="text-muted">{{ line.productSku }} • Ordered {{ line.orderedQty }} • Received {{ line.receivedQty }}</div>
            </div>
            <div class="receive-actions">
              <span class="receive-hint" *ngIf="remainingQty(line) === 1">1 unit</span>
              <input
                *ngIf="remainingQty(line) !== 1"
                type="number"
                class="form-control"
                [(ngModel)]="receiveQuantities[line.productId]"
                min="1"
                [max]="remainingQty(line)"
                (ngModelChange)="onReceiveQuantityChange(line, $event)"
              >
              <button class="btn btn-primary btn-sm" [disabled]="isReceiving || !canSubmitReceive(line)" (click)="submitReceive(line.productId)">
                {{ isReceiving ? 'Saving...' : receiveButtonLabel(line) }}
              </button>
            </div>
          </div>
          <p class="text-muted" *ngIf="receivableLines().length === 0">All order lines are fully received.</p>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-3 text-muted">Loading order details...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .card { background: #171717; border: 1px solid var(--border); border-radius: 12px; }
    .badge { padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.75rem; text-transform: uppercase; }
    .bg-draft { background: #404040; color: #fff; }
    .bg-submitted { background: #d97706; color: #fff; }
    .bg-approved { background: #2563eb; color: #fff; }
    .bg-partially_received { background: #0ea5e9; color: #fff; }
    .bg-received { background: #16a34a; color: #fff; }
    .bg-cancelled { background: #dc2626; color: #fff; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 1.5rem; z-index: 50; }
    .modal-card { width: min(720px, 100%); background: #101010; border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .modal-header h3, .modal-header p { margin: 0; }
    .icon-btn { width: 2rem; height: 2rem; border-radius: 999px; border: 1px solid var(--border); background: #171717; color: white; cursor: pointer; }
    .receive-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .receive-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; background: #171717; border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; }
    .receive-actions { display: flex; gap: 0.75rem; align-items: center; }
    .receive-hint { min-width: 110px; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-weight: 700; }
    .form-control { width: 110px; background: #0a0a0a; border: 1px solid var(--border); color: white; border-radius: 10px; padding: 0.6rem; }
  `]
})
export class OrderDetailComponent implements OnInit {
  order?: PurchaseOrder;
  userRole?: SystemRole;
  warehouseName = '';
  invoiceStatus = '';
  receiveDialogOpen = false;
  isReceiving = false;
  receiveQuantities: Record<number, number> = {};

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private toast: ToastService,
    private authService: AuthService,
    private warehouseService: WarehouseService,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(+id);
    }
    this.authService.currentUser$.subscribe(user => {
      this.userRole = user?.role;
    });
  }

  loadOrder(id: number) {
    this.orderService.getOrderById(id).subscribe(res => {
      this.order = res;
      this.warehouseService.getWarehouseById(res.warehouseId).subscribe({
        next: (warehouse) => this.warehouseName = warehouse.name,
        error: () => this.warehouseName = ''
      });
      this.invoiceService.getInvoiceByPurchaseOrderId(res.id).subscribe({
        next: (invoice) => this.invoiceStatus = invoice.status,
        error: () => this.invoiceStatus = ''
      });
    });
  }

  getStatusClass(status: string) {
    return 'bg-' + status.toLowerCase();
  }

  onAction(action: 'submit' | 'approve') {
    if (!this.order) return;
    
    const obs = action === 'submit' 
      ? this.orderService.submitOrder(this.order.id)
      : this.orderService.approveOrder(this.order.id);

    obs.subscribe({
      next: (updated) => {
        this.order = updated;
        this.toast.success(`Order ${action}d successfully`);
      },
      error: (err) => this.toast.error(err.error?.message || 'Operation failed')
    });
  }

  onReceive() {
    const firstReceivableLine = this.order?.lines.find(line => this.remainingQty(line) > 0);
    if (!firstReceivableLine) {
      this.toast.error('No receivable order lines are available');
      return;
    }
    this.submitReceive(firstReceivableLine.productId);
  }

  canReceiveStock(): boolean {
    return !!this.order
      && this.authService.canReceivePurchaseOrders()
      && (this.order.status === 'APPROVED' || this.order.status === 'PARTIALLY_RECEIVED');
  }

  canCancelOrder(): boolean {
    return !!this.order
      && this.authService.canCancelOrders()
      && ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED'].includes(this.order.status);
  }

  canSubmitOrder(): boolean {
    return !!this.order
      && this.authService.canCreateOrders()
      && this.order.status === 'DRAFT';
  }

  canApproveOrder(): boolean {
    return !!this.order
      && this.authService.canApproveOrders()
      && this.order.status === 'SUBMITTED';
  }

  openReceiveDialog(): void {
    if (!this.order) {
      return;
    }
    if (!this.isInvoicePaidForReceipt()) {
      this.toast.warning('Complete the invoice payment before receiving stock into the warehouse');
      return;
    }
    this.receiveDialogOpen = true;
    this.receiveQuantities = {};
    this.order.lines.forEach(line => {
      this.receiveQuantities[line.productId] = this.remainingQty(line);
    });
  }

  receivableLines(): PurchaseOrder['lines'] {
    return this.order?.lines.filter(line => this.remainingQty(line) > 0) ?? [];
  }

  closeReceiveDialog(): void {
    this.receiveDialogOpen = false;
    this.isReceiving = false;
  }

  remainingQty(line: PurchaseOrder['lines'][number]): number {
    return Math.max(0, line.orderedQty - line.receivedQty);
  }

  canSubmitReceive(line: PurchaseOrder['lines'][number]): boolean {
    const qty = Number(this.receiveQuantities[line.productId] ?? 0);
    return qty > 0 && qty <= this.remainingQty(line);
  }

  onReceiveQuantityChange(line: PurchaseOrder['lines'][number], value: number | string): void {
    const requested = Number(value);
    const remaining = this.remainingQty(line);

    if (!Number.isFinite(requested)) {
      this.receiveQuantities[line.productId] = remaining;
      return;
    }

    this.receiveQuantities[line.productId] = Math.max(1, Math.min(remaining, Math.trunc(requested)));
  }

  receiveButtonLabel(line: PurchaseOrder['lines'][number]): string {
    return this.remainingQty(line) === 1 ? 'Receive 1' : 'Receive';
  }

  submitReceive(productId: number): void {
    if (!this.order) {
      return;
    }
    const line = this.order.lines.find(item => item.productId === productId);
    const quantity = Number(this.receiveQuantities[productId] ?? 0);
    if (!line || quantity <= 0 || quantity > this.remainingQty(line)) {
      this.toast.error('Enter a valid receive quantity');
      return;
    }

    this.isReceiving = true;
    this.orderService.receiveStock(this.order.id, productId, quantity).subscribe({
      next: (updated) => {
        this.order = updated;
        this.loadOrder(this.order.id);
        this.receiveQuantities[productId] = 0;
        this.isReceiving = false;
        if (!updated.lines.some(item => this.remainingQty(item) > 0) || updated.status === 'RECEIVED') {
          this.closeReceiveDialog();
        }
        this.toast.success(updated.status === 'RECEIVED'
          ? 'Stock received and purchase order marked as RECEIVED'
          : 'Stock received and inventory updated');
      },
      error: (err) => {
        this.isReceiving = false;
        this.toast.error(this.extractErrorMessage(err, 'Failed to receive stock'));
      }
    });
  }

  promptCancel(): void {
    if (!this.order) {
      return;
    }
    const reason = prompt('Enter a cancellation reason for this purchase order:');
    if (!reason?.trim()) {
      return;
    }
    this.orderService.cancelOrder(this.order.id, reason.trim()).subscribe({
      next: (updated) => {
        this.order = updated;
        this.toast.success('Order cancelled successfully');
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to cancel order')
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    return err?.error?.message
      || err?.error?.error?.message
      || err?.message
      || fallback;
  }

  isInvoicePaidForReceipt(): boolean {
    return this.invoiceStatus === 'PAID';
  }
}
