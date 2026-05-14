import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupplierService, Supplier, SupplierDeactivationCheck, SUPPLIER_CATEGORY_OPTIONS } from '../../core/services/supplier.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="header">
      <div>
        <h2>{{ editMode ? 'Manage Supplier' : 'Add Supplier' }}</h2>
        <p class="subtitle">{{ editMode ? 'Update supplier controls, contacts, and commercial metadata' : 'Create a supplier record that purchasing and warehouse teams can safely operate against' }}</p>
      </div>
      <button class="btn btn-secondary" (click)="goBack()">Cancel</button>
    </div>

    <div class="card form-card">
      <form [formGroup]="supplierForm" (ngSubmit)="onSubmit()">
        <div class="section-title">Core Information</div>
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Company Name</label>
            <input type="text" id="name" formControlName="name" placeholder="Global Logistics Inc.">
            <div class="error" *ngIf="supplierForm.get('name')?.touched && supplierForm.get('name')?.invalid">
              Name is required
            </div>
          </div>

          <div class="form-group">
            <label for="category">Category</label>
            <select id="category" formControlName="category" class="form-control">
              <option value="">Select Category</option>
              <option *ngFor="let option of categoryOptions" [value]="option.value">{{ option.label }}</option>
            </select>
            <div class="error" *ngIf="supplierForm.get('category')?.touched && supplierForm.get('category')?.invalid">
              Category is required
            </div>
          </div>

          <div class="form-group">
            <label for="contactPerson">Primary Contact</label>
            <input type="text" id="contactPerson" formControlName="contactPerson" placeholder="Jane Doe">
          </div>

          <div class="form-group">
            <label for="contactEmail">Contact Email</label>
            <input type="email" id="contactEmail" formControlName="contactEmail" placeholder="contact@global.com">
            <div class="error" *ngIf="supplierForm.get('contactEmail')?.touched && supplierForm.get('contactEmail')?.invalid">
              Valid email is required
            </div>
          </div>

          <div class="form-group">
            <label for="contactPhone">Contact Phone</label>
            <input type="text" id="contactPhone" formControlName="contactPhone" placeholder="+1 555-1234">
          </div>

          <div class="form-group">
            <label for="address">Address</label>
            <input type="text" id="address" formControlName="address" placeholder="123 Industrial Way">
            <div class="error" *ngIf="supplierForm.get('address')?.touched && supplierForm.get('address')?.invalid">
              Address is required
            </div>
          </div>

          <div class="form-group">
            <label for="city">City</label>
            <input type="text" id="city" formControlName="city" placeholder="San Francisco">
            <div class="error" *ngIf="supplierForm.get('city')?.touched && supplierForm.get('city')?.invalid">
              City is required
            </div>
          </div>

          <div class="form-group">
            <label for="country">Country</label>
            <input type="text" id="country" formControlName="country" placeholder="USA">
            <div class="error" *ngIf="supplierForm.get('country')?.touched && supplierForm.get('country')?.invalid">
              Country is required
            </div>
          </div>
        </div>

        <div class="section-title">Commercial Controls</div>
        <div class="form-grid">
          <div class="form-group">
            <label for="gstin">GSTIN / Tax ID</label>
            <input type="text" id="gstin" formControlName="gstin" placeholder="29ABCDE1234F2Z5">
          </div>

          <div class="form-group">
            <label for="paymentTerms">Payment Terms (days)</label>
            <input type="number" id="paymentTerms" formControlName="paymentTerms" min="0" max="365" placeholder="30">
          </div>

          <div class="form-group">
            <label for="creditLimit">Credit Limit</label>
            <input type="number" id="creditLimit" formControlName="creditLimit" min="0" step="0.01" placeholder="500000">
          </div>

          <div class="form-group form-group-toggle" *ngIf="editMode && isAdmin()">
            <label for="active">Supplier Status</label>
            <select id="active" formControlName="active" class="form-control">
              <option [ngValue]="true">Active</option>
              <option [ngValue]="false">Inactive</option>
            </select>
          </div>
        </div>

        <div class="form-group form-group-full">
          <label for="notes">Admin Notes</label>
          <textarea id="notes" formControlName="notes" rows="4" placeholder="Commercial notes, SLA summary, escalation path, banking caveats..."></textarea>
        </div>

        <div class="audit-strip" *ngIf="editMode && loadedSupplier">
          <span>Supplier ID: #{{ loadedSupplier.id }}</span>
          <span>Created: {{ loadedSupplier.createdAt ? (loadedSupplier.createdAt | date:'medium') : 'Unknown' }}</span>
          <span>Updated: {{ loadedSupplier.updatedAt ? (loadedSupplier.updatedAt | date:'medium') : 'Unknown' }}</span>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-danger"
            *ngIf="editMode && supplierId && isAdmin() && supplierForm.get('active')?.value !== false"
            [disabled]="loading"
            (click)="deactivateSupplier()">
            Deactivate Supplier
          </button>
          <button
            type="button"
            class="btn btn-success"
            *ngIf="editMode && supplierId && isAdmin() && supplierForm.get('active')?.value === false"
            [disabled]="loading"
            (click)="reactivateSupplier()">
            Reactivate Supplier
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="supplierForm.invalid || loading">
            {{ loading ? 'Processing...' : (editMode ? 'Update Supplier' : 'Register Supplier') }}
          </button>
        </div>
      </form>
    </div>

    <div class="modal-backdrop" *ngIf="deleteDialogOpen" (click)="closeDeleteDialog()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>{{ deleteCheck?.canDeactivate ? 'Deactivate Supplier' : 'Supplier Has Active Dependencies' }}</h3>
            <p>{{ supplierForm.get('name')?.value }}</p>
          </div>
          <button class="icon-btn" type="button" (click)="closeDeleteDialog()">×</button>
        </div>

        <p class="modal-copy" *ngIf="deleteCheck?.canDeactivate">
          This supplier can be deactivated safely. Historical records will be retained.
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
          <button class="btn btn-outline" type="button" (click)="closeDeleteDialog()">Close</button>
          <button
            class="btn btn-danger"
            type="button"
            *ngIf="deleteCheck?.canDeactivate && supplierId"
            [disabled]="loading"
            (click)="confirmDeactivateSupplier()">
            {{ loading ? 'Deactivating...' : 'Confirm Deactivate' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .subtitle { margin: 0.35rem 0 0; color: var(--text-muted); max-width: 56rem; }
    .form-card { max-width: 800px; width: 100%; margin: 0 auto; padding: 2rem; }
    .section-title { margin: 0 0 1rem; color: white; font-size: 0.95rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #a3a3a3; }
    .form-group input, .form-group select, .form-group textarea { padding: 0.75rem; background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--primary); outline: none; }
    .form-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .error { color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; }
    .form-group-full { margin-bottom: 2rem; }
    .form-group-toggle { align-self: end; }
    .audit-strip { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1rem 0 1.5rem; color: var(--text-muted); font-size: 0.875rem; }
    .btn-danger { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
    .btn-success { background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; }
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
      .header { flex-direction: column; align-items: stretch; }
      .header .btn { width: 100%; }
      .form-card { padding: 1.25rem; }
      .form-actions { flex-direction: column-reverse; align-items: stretch; }
      .form-actions .btn { width: 100%; }
      .modal-header { flex-direction: column; }
      .icon-btn { align-self: flex-end; }
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .dependency-grid { grid-template-columns: 1fr; }
    }
    .form-control { width: 100%; }
  `]
})
export class SupplierFormComponent implements OnInit {
  supplierForm: FormGroup;
  loading = false;
  editMode = false;
  supplierId?: number;
  loadedSupplier?: Supplier;
  deleteDialogOpen = false;
  deleteCheck?: SupplierDeactivationCheck;
  readonly categoryOptions = SUPPLIER_CATEGORY_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      contactPerson: [''],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['India', Validators.required],
      gstin: [''],
      paymentTerms: [30, [Validators.min(0), Validators.max(365)]],
      creditLimit: [null, Validators.min(0)],
      notes: [''],
      active: [true]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.supplierId = +id;
      this.loadSupplier(this.supplierId);
    }
  }

  loadSupplier(id: number): void {
    this.loading = true;
    this.supplierService.getSupplierById(id).subscribe({
      next: (s) => {
        this.loadedSupplier = s;
        this.supplierForm.patchValue(s);
        this.loading = false;
      },
      error: () => {
        this.toastService.show('Error loading supplier data', 'error');
        this.router.navigate(['/suppliers']);
      }
    });
  }

  onSubmit(): void {
    if (this.supplierForm.invalid) return;

    this.loading = true;
    const supplierData = this.supplierForm.value;

    const request = this.editMode && this.supplierId
      ? this.supplierService.updateSupplier(this.supplierId, supplierData)
      : this.supplierService.createSupplier(supplierData);

    request.subscribe({
      next: () => {
        this.toastService.show(`Supplier ${this.editMode ? 'updated' : 'registered'} successfully`, 'success');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to save supplier', 'error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/suppliers']);
  }

  isAdmin(): boolean {
    return this.authService.currentUserValue?.role === 'ADMIN';
  }

  deactivateSupplier(): void {
    if (!this.supplierId) {
      return;
    }
    this.deleteDialogOpen = true;
    this.deleteCheck = undefined;
    this.supplierService.getDeactivationCheck(this.supplierId).subscribe({
      next: (check) => {
        this.deleteCheck = check;
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to load supplier dependency check', 'error');
        this.closeDeleteDialog();
      }
    });
  }

  reactivateSupplier(): void {
    if (!this.supplierId) {
      return;
    }

    this.loading = true;
    this.supplierService.reactivateSupplier(this.supplierId).subscribe({
      next: () => {
        this.toastService.show('Supplier reactivated successfully', 'success');
        this.supplierForm.patchValue({ active: true });
        if (this.loadedSupplier) {
          this.loadedSupplier = { ...this.loadedSupplier, active: true };
        }
        this.loading = false;
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to reactivate supplier', 'error');
        this.loading = false;
      }
    });
  }

  confirmDeactivateSupplier(): void {
    if (!this.supplierId || !this.deleteCheck?.canDeactivate) {
      return;
    }

    this.loading = true;
    this.supplierService.deleteSupplier(this.supplierId).subscribe({
      next: () => {
        this.toastService.show('Supplier deactivated successfully', 'success');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to deactivate supplier', 'error');
        this.loading = false;
      }
    });
  }

  closeDeleteDialog(): void {
    this.deleteDialogOpen = false;
    this.deleteCheck = undefined;
  }

  formatStatusList(statuses: string[]): string {
    return statuses
      .map(status => status.toLowerCase().split('_').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '))
      .join(', ');
  }
}
