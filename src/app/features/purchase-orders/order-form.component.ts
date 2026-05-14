import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { SupplierService, Supplier } from '../../core/services/supplier.service';
import { WarehouseService, Warehouse } from '../../core/services/warehouse.service';
import { ProductService, Product } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="header mb-5">
      <div class="title-group">
        <h2>New Procurement Draft</h2>
        <p class="subtitle">Initialize a secure transaction with automated stock verification</p>
      </div>
    </div>

    <form [formGroup]="orderForm" (ngSubmit)="onSubmit()">
      <div class="row mb-5">
        <div class="col-md-6">
          <div class="card p-5 h-100">
            <div class="form-group mb-4">
              <label>Authorized Partner (Supplier)</label>
              <select formControlName="supplierId" class="form-control">
                <option value="">Select identity...</option>
                <option *ngFor="let s of suppliers" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="form-group mb-0">
              <label>Destination Node (Warehouse)</label>
              <select formControlName="warehouseId" class="form-control">
                <option value="">Select destination...</option>
                <option *ngFor="let w of warehouses" [value]="w.id" [disabled]="!hasTrackedCapacity(w)">
                  {{ w.name }} ({{ w.city }}){{ hasTrackedCapacity(w) ? '' : ' — capacity not configured' }}
                </option>
              </select>
              <div class="warehouse-helper" *ngIf="selectedWarehouse">
                <span *ngIf="hasTrackedCapacity(selectedWarehouse)">
                  Free tracked capacity: {{ remainingCapacity(selectedWarehouse) }} / {{ selectedWarehouse.totalStorageCapacity }}
                </span>
                <span *ngIf="!hasTrackedCapacity(selectedWarehouse)">
                  This warehouse cannot receive purchase orders until a positive tracked capacity is configured.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card p-5 h-100 d-flex flex-column justify-content-center align-items-center text-center">
            <div class="stat-label mb-2">Projected Valuation</div>
            <div class="stat-value" style="font-size: 3.5rem; color: white; font-weight: 900;">{{ calculateTotal() | currency:'INR':'symbol':'1.2-2' }}</div>
            <div class="stat-change">{{ lines.length }} protocol items in draft</div>
          </div>
        </div>
      </div>

      <div class="items-section card p-5">
        <div class="d-flex justify-content-between align-items-center mb-5">
          <h4 class="mb-0 section-title">Transaction Items</h4>
          <button type="button" class="btn btn-outline btn-sm" (click)="addLine()">+ Add Asset</button>
        </div>

        <div formArrayName="lines">
          <div *ngFor="let line of lines.controls; let i=index" [formGroupName]="i" class="item-row mb-4">
            <div class="row align-items-end g-4">
              <div class="col-md-4">
                <label class="form-label-small">Asset Definition</label>
                <select formControlName="productId" class="form-control" (change)="onProductChange(i)">
                  <option value="">Choose asset...</option>
                  <option *ngFor="let p of products" [value]="p.id">
                    {{ p.name }} — {{ p.sku }}
                  </option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label-small">Quantity</label>
                <input type="number" formControlName="orderedQty" class="form-control" min="1">
              </div>
              <div class="col-md-2">
                <label class="form-label-small">Unit Valuation</label>
                <input type="number" formControlName="unitPrice" class="form-control" step="0.01">
              </div>
              <div class="col-md-3">
                <label class="form-label-small">Asset Subtotal</label>
                <div class="subtotal-val">
                  {{ (line.get('orderedQty')?.value || 0) * (line.get('unitPrice')?.value || 0) | currency:'INR':'symbol':'1.2-2' }}
                </div>
              </div>
              <div class="col-md-1 text-end">
                <button type="button" class="btn-remove" (click)="removeLine(i)">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions mt-5 d-flex justify-content-end gap-3">
        <button type="button" class="btn btn-outline" routerLink="/purchase-orders">Discard Manifesto</button>
        <button type="submit" class="btn btn-primary" [disabled]="orderForm.invalid || loading">
          {{ loading ? 'Synchronizing...' : 'Authorize Transaction' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .header { margin-bottom: 3rem; }
    .title-group h2 { font-size: 2rem; font-weight: 900; color: white; margin-bottom: 0.25rem; letter-spacing: -0.04em; }
    .subtitle { color: var(--text-muted); font-size: 1rem; font-weight: 500; }
    .warehouse-helper { margin-top: 0.75rem; color: var(--text-muted); font-size: 0.82rem; line-height: 1.4; }

    .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing: 0.15em; }
    
    .section-title { font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.85rem; color: var(--primary); }

    .item-row { 
      background: rgba(255,255,255,0.01); 
      padding: 2rem; 
      border-radius: 16px; 
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }
    .item-row:hover { 
      background: rgba(255,255,255,0.03); 
      border-color: var(--primary-soft);
    }

    .form-label-small { 
      display: block; 
      font-size: 0.65rem; 
      font-weight: 800; 
      color: var(--text-muted); 
      margin-bottom: 0.75rem; 
      text-transform: uppercase; 
      letter-spacing: 0.1em; 
    }

    .subtotal-val { font-weight: 800; font-size: 1.15rem; color: white; padding: 0.5rem 0; }

    .btn-remove { 
      background: rgba(185, 28, 28, 0.1); 
      border: 1px solid rgba(185, 28, 28, 0.2); 
      color: #ef4444; 
      width: 40px; 
      height: 40px; 
      border-radius: 10px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 1.5rem; 
      cursor: pointer; 
      transition: all 0.2s; 
    }
    .btn-remove:hover { background: #b91c1c; color: white; }

    .form-actions .btn { min-width: 200px; }
  `]
})
export class OrderFormComponent implements OnInit {
  orderForm: FormGroup;
  suppliers: Supplier[] = [];
  warehouses: Warehouse[] = [];
  products: Product[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private supplierService: SupplierService,
    private warehouseService: WarehouseService,
    private productService: ProductService,
    private toast: ToastService,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      supplierId: ['', Validators.required],
      warehouseId: ['', Validators.required],
      lines: this.fb.array([], Validators.required)
    });
  }

  ngOnInit(): void {
    this.supplierService.getSuppliers().subscribe(res => this.suppliers = res.content);
    this.warehouseService.getWarehouses(true).subscribe(res => this.warehouses = res);
    this.productService.getProducts().subscribe(res => this.products = res.content);
    this.addLine();
  }

  get lines() {
    return this.orderForm.get('lines') as FormArray;
  }

  get selectedWarehouse(): Warehouse | undefined {
    const warehouseId = Number(this.orderForm.get('warehouseId')?.value);
    return this.warehouses.find(warehouse => warehouse.id === warehouseId);
  }

  addLine() {
    const lineGroup = this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      productSku: [''],
      orderedQty: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]]
    });
    this.lines.push(lineGroup);
  }

  onProductChange(index: number) {
    const line = this.lines.at(index);
    const productId = +line.get('productId')?.value;
    const product = this.products.find(p => p.id === productId);
    if (product) {
      line.patchValue({
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.price || 0
      });
    }
  }

  removeLine(index: number) {
    if (this.lines.length > 1) {
      this.lines.removeAt(index);
    }
  }

  calculateTotal() {
    return this.lines.controls.reduce((acc, line) => {
      const qty = line.get('orderedQty')?.value || 0;
      const price = line.get('unitPrice')?.value || 0;
      return acc + (qty * price);
    }, 0);
  }

  remainingCapacity(warehouse: Warehouse): number {
    if (!this.hasTrackedCapacity(warehouse)) {
      return 0;
    }
    return Math.max(0, warehouse.totalStorageCapacity! - (warehouse.currentCapacityUtilization || 0));
  }

  hasTrackedCapacity(warehouse: Warehouse | undefined): boolean {
    return !!warehouse && warehouse.totalStorageCapacity != null && warehouse.totalStorageCapacity > 0;
  }

  requestedUnits(): number {
    return this.lines.controls.reduce((acc, line) => acc + Number(line.get('orderedQty')?.value || 0), 0);
  }

  onSubmit() {
    if (this.orderForm.invalid) return;

    if (this.selectedWarehouse && !this.hasTrackedCapacity(this.selectedWarehouse)) {
      this.toast.error(`Set a positive max capacity for ${this.selectedWarehouse.name} before creating orders for it.`);
      return;
    }

    if (this.selectedWarehouse && this.hasTrackedCapacity(this.selectedWarehouse)) {
      const remaining = this.remainingCapacity(this.selectedWarehouse);
      const requestedUnits = this.requestedUnits();
      if (requestedUnits > remaining) {
        this.toast.error(`Only ${remaining} tracked unit(s) are free in ${this.selectedWarehouse.name}, but this order needs ${requestedUnits}.`);
        return;
      }
    }

    this.loading = true;
    const payload = this.orderForm.value;
    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.toast.success('Procurement transaction authorized');
        this.router.navigate(['/purchase-orders']);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Authorization failed');
      }
    });
  }
}
