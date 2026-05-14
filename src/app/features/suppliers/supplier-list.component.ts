import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Supplier, SupplierDeactivationCheck, SupplierService } from '../../core/services/supplier.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, ServiceUnavailableComponent, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1>Suppliers</h1>
        <p class="subtitle">Admin registry for onboarding, supplier status control, and commercial records</p>
      </div>
      <a routerLink="/suppliers/new" class="btn btn-primary">+ Add Supplier</a>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">Results</span>
        <strong>{{ totalElements }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Active In View</span>
        <strong>{{ activeCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Inactive In View</span>
        <strong>{{ inactiveCount }}</strong>
      </div>
    </div>

    <div class="search-section mb-5">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (keyup.enter)="onSearch()"
          placeholder="Search by supplier ID, name, email, contact, phone, GSTIN, address, city, country, or category"
          class="search-input">
        <select class="status-filter" [(ngModel)]="statusFilter" (change)="onFilterChange()">
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <button class="btn btn-primary" (click)="onSearch()">Search</button>
        <button class="btn btn-outline" *ngIf="searchQuery || statusFilter !== 'all'" (click)="clearFilters()">Reset</button>
      </div>
    </div>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="table-wrapper">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Primary Contact</th>
              <th>Commercial Profile</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of suppliers">
              <td>
                <strong>{{ s.name }}</strong><br>
                <small class="text-muted">#{{ s.id }} • {{ s.city }}, {{ s.country }}</small>
              </td>
              <td>
                <strong>{{ s.contactPerson || 'No contact assigned' }}</strong><br>
                <small class="text-muted">{{ s.contactEmail }}<span *ngIf="s.contactPhone"> • {{ s.contactPhone }}</span></small>
              </td>
              <td>
                <span class="badge info category-badge">{{ formatCategory(s.category) }}</span><br>
                <small class="text-muted">GSTIN: {{ s.gstin || 'Not captured' }}</small>
              </td>
              <td>
                <span class="badge" [ngClass]="s.active !== false ? 'approved' : 'cancelled'">
                  {{ s.active !== false ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="text-right">
                <div class="action-group">
                  <a [routerLink]="['/suppliers', s.id, 'edit']" class="btn btn-outline btn-sm">Manage</a>
                  <button
                    *ngIf="canDeleteSuppliers() && s.id && s.active !== false"
                    class="btn btn-danger btn-sm"
                    [disabled]="deletingId === s.id || loading"
                    (click)="deleteSupplier(s)">
                    {{ deletingId === s.id ? 'Deleting...' : 'Delete' }}
                  </button>
                  <button
                    *ngIf="canDeleteSuppliers() && s.id && s.active === false"
                    class="btn btn-success btn-sm"
                    [disabled]="reactivatingId === s.id || loading"
                    (click)="reactivateSupplier(s)">
                    {{ reactivatingId === s.id ? 'Reactivating...' : 'Reactivate' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="suppliers.length === 0 && !loading">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">🚛</div>
                <p>No suppliers matched the current search or status filters.</p>
                <a routerLink="/suppliers/new" class="btn btn-primary">Add Supplier</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button [disabled]="currentPage === 0" (click)="changePage(currentPage - 1)" class="btn btn-outline">Prev</button>
        <span class="page-info">Page {{ currentPage + 1 }} of {{ totalPages }}</span>
        <button [disabled]="currentPage === totalPages - 1" (click)="changePage(currentPage + 1)" class="btn btn-outline">Next</button>
      </div>
    </ng-container>

    <div class="modal-backdrop" *ngIf="deleteDialogOpen" (click)="closeDeleteDialog()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>{{ deleteCheck?.canDeactivate ? 'Deactivate Supplier' : 'Supplier Has Active Dependencies' }}</h3>
            <p>{{ deleteTarget?.name }}</p>
          </div>
          <button class="icon-btn" (click)="closeDeleteDialog()">×</button>
        </div>

        <p class="modal-copy" *ngIf="deleteCheck?.canDeactivate">
          This will deactivate the supplier and remove it from active operations without deleting historical records.
        </p>
        <p class="modal-copy" *ngIf="deleteCheck && !deleteCheck.canDeactivate">
          {{ deleteCheck.message || 'This supplier still has active operational or financial dependencies.' }}
        </p>

        <div class="dependency-grid" *ngIf="deleteCheck && !deleteCheck.canDeactivate">
          <div class="dependency-card" *ngIf="deleteCheck.blockingOrderCount > 0">
            <span class="dependency-label">Blocking Orders</span>
            <strong>{{ deleteCheck.blockingOrderCount }}</strong>
            <small>{{ formatStatusList(deleteCheck.blockingStatuses) }}</small>
            <div class="reference-list">
              <span class="reference-chip" *ngFor="let ref of deleteCheck.blockingOrderNumbers">{{ ref }}</span>
            </div>
          </div>
          <div class="dependency-card" *ngIf="deleteCheck.blockingInvoiceCount > 0">
            <span class="dependency-label">Blocking Invoices</span>
            <strong>{{ deleteCheck.blockingInvoiceCount }}</strong>
            <small>{{ formatStatusList(deleteCheck.blockingInvoiceStatuses) }}</small>
            <div class="reference-list">
              <span class="reference-chip" *ngFor="let ref of deleteCheck.blockingInvoiceNumbers">{{ ref }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" (click)="closeDeleteDialog()">Close</button>
          <button
            class="btn btn-danger"
            *ngIf="deleteCheck?.canDeactivate && deleteTarget?.id"
            [disabled]="deletingId === deleteTarget?.id"
            (click)="confirmDeleteSupplier()">
            {{ deletingId === deleteTarget?.id ? 'Deactivating...' : 'Confirm Deactivate' }}
          </button>
        </div>
      </div>
    </div>

    <ng-template #errorState>
      <app-service-unavailable 
        serviceName="Partner Registry" 
        (retry)="loadSuppliers()">
      </app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .page-header { margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; }
    .page-header h1 { font-size: clamp(2rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1.1rem; font-weight: 500; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 2rem; max-width: 800px; }
    .summary-card { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem 1.25rem; }
    .summary-label { display: block; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.45rem; }
    .summary-card strong { font-size: 1.5rem; color: white; }

    .search-bar { 
      background: #141414; 
      border: 1px solid var(--border); 
      padding: 0.5rem; 
      border-radius: 16px; 
      display: flex; 
      align-items: center; 
      max-width: 800px;
      gap: 0.5rem;
    }
    .search-icon { padding: 0 1rem; opacity: 0.5; }
    .search-input { 
      flex: 1; 
      background: transparent; 
      border: none; 
      color: white; 
      padding: 0.75rem; 
      font-size: 1rem; 
      outline: none;
    }
    .search-input::placeholder { color: #525252; }
    .status-filter {
      background: #0a0a0a;
      border: 1px solid var(--border);
      color: white;
      padding: 0.75rem;
      border-radius: 10px;
      min-width: 150px;
    }

    .table-wrapper { background: #000; border-radius: 24px; overflow-x: auto; overflow-y: hidden; }
    .category-badge { white-space: nowrap; overflow-wrap: normal; word-break: keep-all; }
    .text-right { text-align: right; }
    .action-group { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn-danger { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.18); }
    .btn-success { background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; }
    .btn-success:hover { background: rgba(34, 197, 94, 0.18); }

    .empty-state { text-align: center; padding: 6rem 2rem !important; color: #525252; }
    .empty-icon { font-size: 3rem; margin-bottom: 1.5rem; opacity: 0.2; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 2rem; margin-top: 4rem; }
    .page-info { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 1.5rem; z-index: 50; }
    .modal-card { width: min(680px, 100%); background: #101010; border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; box-shadow: 0 30px 80px rgba(0,0,0,0.45); }
    .modal-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .modal-header h3 { margin: 0; font-size: 1.25rem; }
    .modal-header p { margin: 0.35rem 0 0; color: var(--text-muted); }
    .modal-copy { color: #d4d4d4; margin: 0 0 1rem; line-height: 1.5; }
    .icon-btn { width: 2rem; height: 2rem; border-radius: 999px; border: 1px solid var(--border); background: #171717; color: white; cursor: pointer; }
    .dependency-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .dependency-card { background: #141414; border: 1px solid var(--border); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .dependency-label { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .dependency-card strong { font-size: 1.5rem; }
    .dependency-card small { color: var(--text-muted); }
    .reference-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .reference-chip { padding: 0.35rem 0.55rem; border-radius: 999px; background: #0a0a0a; border: 1px solid var(--border); color: #e5e5e5; font-size: 0.8rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem; }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; }
      .summary-grid { grid-template-columns: 1fr; }
      .search-bar { flex-wrap: wrap; }
      .status-filter, .search-input { width: 100%; }
      .dependency-grid { grid-template-columns: 1fr; }
      .action-group { justify-content: flex-start; flex-wrap: wrap; }
      .pagination { flex-direction: column; gap: 1rem; }
    }
  `]
})
export class SupplierListComponent implements OnInit {
  suppliers: Supplier[] = [];
  loading = false;
  serviceError = false;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  deletingId?: number;
  reactivatingId?: number;
  deleteDialogOpen = false;
  deleteTarget?: Supplier;
  deleteCheck?: SupplierDeactivationCheck;

  constructor(
    private supplierService: SupplierService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(page: number = 0): void {
    this.loading = true;
    this.serviceError = false;
    const activeFilter = this.statusFilter === 'all' ? undefined : this.statusFilter === 'active';
    const request = this.searchQuery.trim()
      ? this.supplierService.searchSuppliers(this.searchQuery, page, 20, activeFilter)
      : this.supplierService.getSuppliers(page, 20, activeFilter);

    request.subscribe({
      next: (pageData) => {
        this.suppliers = pageData.content || [];
        this.totalPages = pageData.totalPages;
        this.currentPage = pageData.number;
        this.totalElements = pageData.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching suppliers:', err);
        this.loading = false;
        if (err.status === 503 || err.status === 504 || err.status === 0) {
          this.serviceError = true;
        }
      }
    });
  }

  onSearch(): void {
    this.loadSuppliers(0);
  }

  onFilterChange(): void {
    this.loadSuppliers(0);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.loadSuppliers(0);
  }

  changePage(newPage: number): void {
    this.loadSuppliers(newPage);
  }

  deleteSupplier(supplier: Supplier): void {
    if (!supplier.id || supplier.active === false) {
      return;
    }
    this.deleteTarget = supplier;
    this.deleteCheck = undefined;
    this.deleteDialogOpen = true;
    this.supplierService.getDeactivationCheck(supplier.id).subscribe({
      next: (check) => {
        this.deleteCheck = check;
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to load supplier dependency check');
        this.closeDeleteDialog();
      }
    });
  }

  reactivateSupplier(supplier: Supplier): void {
    if (!supplier.id || supplier.active !== false) {
      return;
    }

    const confirmed = confirm(`Reactivate supplier "${supplier.name}"? This will make it available for active operations again.`);
    if (!confirmed) {
      return;
    }

    this.reactivatingId = supplier.id;
    this.supplierService.reactivateSupplier(supplier.id).subscribe({
      next: () => {
        this.toastService.success('Supplier reactivated successfully');
        this.reactivatingId = undefined;
        this.loadSuppliers(this.currentPage);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to reactivate supplier');
        this.reactivatingId = undefined;
      }
    });
  }

  canDeleteSuppliers(): boolean {
    return this.authService.currentUserValue?.role === 'ADMIN';
  }

  closeDeleteDialog(): void {
    this.deleteDialogOpen = false;
    this.deleteTarget = undefined;
    this.deleteCheck = undefined;
  }

  confirmDeleteSupplier(): void {
    if (!this.deleteTarget?.id || !this.deleteCheck?.canDeactivate) {
      return;
    }

    this.deletingId = this.deleteTarget.id;
    this.supplierService.deleteSupplier(this.deleteTarget.id).subscribe({
      next: () => {
        this.toastService.success('Supplier deactivated successfully');
        this.deletingId = undefined;
        this.closeDeleteDialog();
        this.loadSuppliers(this.currentPage);
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to delete supplier');
        this.deletingId = undefined;
      }
    });
  }

  formatStatusList(statuses: string[]): string {
    return statuses.map(status => this.formatCategory(status)).join(', ');
  }

  formatCategory(category?: string): string {
    if (!category) {
      return 'Uncategorized';
    }

    return category
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  get activeCount(): number {
    return this.statusFilter === 'inactive' ? 0 : this.suppliers.filter(s => s.active !== false).length;
  }

  get inactiveCount(): number {
    return this.statusFilter === 'active' ? 0 : this.suppliers.filter(s => s.active === false).length;
  }
}
