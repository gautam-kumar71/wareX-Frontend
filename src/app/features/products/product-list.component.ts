import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ServiceUnavailableComponent],
  template: `
    <div class="header mb-5">
      <div class="title-group">
        <h2>Products</h2>
        <p class="subtitle">Manage inventory items and catalog</p>
      </div>
      <button *ngIf="canManageProducts()" class="btn btn-primary action-btn" [disabled]="serviceError" routerLink="/products/new">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Add Product</span>
      </button>
    </div>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="table-card desktop-table">
        <table class="modern-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Dimensions (LxWxH)</th>
              <th>Weight</th>
              <th>Stock</th>
              <th>Status</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let prod of products">
              <td><span class="badge">{{ prod.sku }}</span></td>
              <td><strong>{{ prod.name }}</strong></td>
              <td class="text-muted product-category-cell">{{ prod.category || 'N/A' }}</td>
              <td>{{ prod.price | currency:'INR':'symbol':'1.2-2' }}</td>
              <td class="text-muted">
                <span *ngIf="prod.length || prod.width || prod.height">
                  {{ prod.length || '-' }}x{{ prod.width || '-' }}x{{ prod.height || '-' }} {{ dimensionUnitLabel(prod) }}
                </span>
                <span *ngIf="!prod.length && !prod.width && !prod.height">-</span>
              </td>
              <td class="text-muted">{{ prod.weight ? prod.weight + ' ' + weightUnitLabel(prod) : '-' }}</td>
              <td>{{ prod.totalStock || 0 }}</td>
              <td>
                <span class="badge" [ngClass]="prod.active ? 'approved' : 'cancelled'">
                  {{ prod.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="text-right">
                <a *ngIf="canManageProducts()" [routerLink]="['/products', prod.id, 'edit']" class="btn btn-outline btn-sm">Edit</a>
              </td>
            </tr>
            <tr *ngIf="products.length === 0 && !loading">
              <td colspan="9" class="empty-state">
                <div class="empty-icon">📦</div>
                <p>No products found.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="product-stack mobile-stack" *ngIf="products.length > 0">
        <article class="product-card" *ngFor="let prod of products">
          <div class="product-card-head">
            <div class="product-title-wrap">
              <span class="sku-chip">{{ prod.sku }}</span>
              <strong class="product-title">{{ prod.name }}</strong>
            </div>
            <span class="badge" [ngClass]="prod.active ? 'approved' : 'cancelled'">
              {{ prod.active ? 'Active' : 'Inactive' }}
            </span>
          </div>

          <div class="product-card-grid">
            <div class="product-field">
              <span class="field-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M4 12h10M4 17h8" />
                </svg>
                Category
              </span>
                <strong class="category-value">{{ prod.category || 'N/A' }}</strong>
            </div>
            <div class="product-field">
              <span class="field-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v18M7 7.5c0-1.9 1.9-3.5 5-3.5s5 1.5 5 3.5-1.7 3-5 3-5 1.3-5 3.5S8.9 18 12 18s5-1.5 5-3.5" />
                </svg>
                Price
              </span>
              <strong>{{ prod.price | currency:'INR':'symbol':'1.2-2' }}</strong>
            </div>
            <div class="product-field">
              <span class="field-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                </svg>
                Dimensions
              </span>
              <strong>
                <span *ngIf="prod.length || prod.width || prod.height">
                  {{ prod.length || '-' }}x{{ prod.width || '-' }}x{{ prod.height || '-' }} {{ dimensionUnitLabel(prod) }}
                </span>
                <span *ngIf="!prod.length && !prod.width && !prod.height">-</span>
              </strong>
            </div>
            <div class="product-field">
              <span class="field-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7h10l2 5v5H5v-5l2-5ZM9 7V5h6v2" />
                </svg>
                Weight
              </span>
              <strong>{{ prod.weight ? prod.weight + ' ' + weightUnitLabel(prod) : '-' }}</strong>
            </div>
            <div class="product-field">
              <span class="field-label">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 17h16M7 17V9h3v8M14 17V5h3v12" />
                </svg>
                Stock
              </span>
              <strong>{{ prod.totalStock || 0 }}</strong>
            </div>
          </div>

          <a *ngIf="canManageProducts()" [routerLink]="['/products', prod.id, 'edit']" class="btn btn-outline product-edit-btn">Edit Product</a>
        </article>
      </div>

      <div class="mobile-empty-state mobile-stack" *ngIf="products.length === 0 && !loading">
        <div class="empty-icon">[ ]</div>
        <p>No products found.</p>
      </div>
    </ng-container>

    <ng-template #errorState>
      <app-service-unavailable 
        serviceName="Product Service" 
        (retry)="loadProducts()">
      </app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1.25rem; }
    .title-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .title-group h2 { font-size: clamp(1.5rem, 2vw, 1.8rem); font-weight: 900; color: white; margin: 0; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; margin: 0; }
    .action-btn { gap: 0.55rem; }
    .action-btn svg,
    .field-label svg { width: 0.95rem; height: 0.95rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
    .table-card { background: transparent; border: none; padding: 0; }
    .desktop-table { display: block; }
    .mobile-stack { display: none; }
    .product-stack { gap: 1rem; }
    .product-card { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; }
    .product-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem; margin-bottom: 1rem; }
    .product-title-wrap { display: flex; flex-direction: column; gap: 0.65rem; min-width: 0; }
    .sku-chip { display: inline-flex; width: fit-content; max-width: 100%; padding: 0.35rem 0.65rem; border-radius: 999px; background: rgba(74, 124, 68, 0.14); color: #9bd38e; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; overflow-wrap: anywhere; }
    .product-title { font-size: 1rem; color: white; overflow-wrap: anywhere; }
    .product-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; margin-bottom: 1rem; }
    .product-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .product-category-cell,
    .category-value { white-space: nowrap; overflow-wrap: normal; word-break: keep-all; }
    .field-label { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text-muted); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .product-edit-btn { width: 100%; }
    .mobile-empty-state { text-align: center; padding: 2.5rem 1.25rem; background: #111; border: 1px solid var(--border); border-radius: 18px; color: var(--text-muted); }
    .empty-state { text-align: center; padding: 6rem 2rem !important; color: var(--text-muted); }
    .empty-icon { font-size: 2.5rem; margin-bottom: 1.5rem; opacity: 0.1; }
    .text-right { text-align: right; }
    @media (max-width: 768px) {
      .desktop-table { display: none; }
      .mobile-stack { display: block; }
      .product-stack.mobile-stack { display: grid; }
      .header { flex-direction: column; align-items: stretch; }
      .title-group { min-width: 0; }
      .title-group h2 { font-size: 1.35rem; }
      .subtitle { font-size: 0.82rem; }
      .header .btn { width: 100%; }
      .product-card-grid { grid-template-columns: 1fr; }
      .product-card-head { flex-direction: column; }
    }
  `]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  loading = false;
  serviceError = false;

  constructor(private productService: ProductService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.serviceError = false;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.loading = false;
        if (err.status === 503 || err.status === 504 || err.status === 0) {
          this.serviceError = true;
        }
      }
    });
  }

  canManageProducts(): boolean {
    return this.authService.canManageProducts();
  }

  weightUnitLabel(product: Product): string {
    const normalizedLegacy = (product.unit ?? '').trim().toLowerCase();
    return product.weightUnit || (['mg', 'g', 'kg', 'lb', 'oz'].includes(normalizedLegacy) ? normalizedLegacy : 'kg');
  }

  dimensionUnitLabel(product: Product): string {
    const normalizedLegacy = (product.unit ?? '').trim().toLowerCase();
    return product.dimensionUnit || (['mm', 'cm', 'm', 'in', 'ft'].includes(normalizedLegacy) ? normalizedLegacy : 'cm');
  }
}
