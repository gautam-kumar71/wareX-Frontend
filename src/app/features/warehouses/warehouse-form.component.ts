import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WarehouseService, Warehouse } from '../../core/services/warehouse.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-warehouse-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="header">
      <div>
        <h2>{{ editMode ? 'Manage' : 'Register' }} Warehouse</h2>
        <p class="subtitle">Set capacity, operating owner, and contact details for this storage node</p>
        <div class="status-banner" *ngIf="editMode">
          <span class="status-pill" [class.status-pill-inactive]="!warehouseActive">
            {{ warehouseActive ? 'Active' : 'Inactive' }}
          </span>
          <span class="status-copy" *ngIf="!warehouseActive">This warehouse is currently inactive and hidden from active warehouse operations.</span>
        </div>
      </div>
      <button class="btn btn-secondary" (click)="goBack()">Cancel</button>
    </div>

    <div class="card form-card">
      <form [formGroup]="warehouseForm" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Warehouse Name</label>
            <input type="text" id="name" formControlName="name" placeholder="e.g. Central Hub A">
            <div class="error" *ngIf="warehouseForm.get('name')?.touched && warehouseForm.get('name')?.invalid">
              Name is required
            </div>
          </div>

          <div class="form-group">
            <label for="location">Street Address / Location</label>
            <input type="text" id="location" formControlName="location" placeholder="123 Logistics Way">
            <div class="error" *ngIf="warehouseForm.get('location')?.touched && warehouseForm.get('location')?.invalid">
              Location is required
            </div>
          </div>

          <div class="form-group">
            <label for="city">City</label>
            <input type="text" id="city" formControlName="city" placeholder="Chicago">
            <div class="error" *ngIf="warehouseForm.get('city')?.touched && warehouseForm.get('city')?.invalid">
              City is required
            </div>
          </div>

          <div class="form-group">
            <label for="country">Country</label>
            <input type="text" id="country" formControlName="country" placeholder="USA">
            <div class="error" *ngIf="warehouseForm.get('country')?.touched && warehouseForm.get('country')?.invalid">
              Country is required
            </div>
          </div>

          <div class="form-group">
            <label for="totalStorageCapacity">Total Storage Capacity</label>
            <input type="number" id="totalStorageCapacity" formControlName="totalStorageCapacity" placeholder="e.g. 10000">
          </div>

          <div class="form-group">
            <label for="managerName">Manager Name</label>
            <input type="text" id="managerName" formControlName="managerName" placeholder="John Doe">
          </div>

          <div class="form-group">
            <label for="contactPhone">Contact Phone</label>
            <input type="text" id="contactPhone" formControlName="contactPhone" placeholder="+1 234 567 8900">
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn"
            [class.btn-danger]="warehouseActive"
            [class.btn-success-alt]="!warehouseActive"
            *ngIf="editMode && warehouseId && isAdmin()"
            [disabled]="loading"
            (click)="warehouseActive ? deactivateWarehouse() : reactivateWarehouse()"
          >
            {{ warehouseActive ? 'Deactivate Warehouse' : 'Reactivate Warehouse' }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            *ngIf="editMode && warehouseId && canManageWarehouses() && !isAdmin() && warehouseActive"
            [disabled]="true"
            title="Only admins can deactivate or reactivate warehouses."
          >
            Deactivate Warehouse
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="warehouseForm.invalid || loading">
            {{ loading ? 'Processing...' : (editMode ? 'Update Warehouse' : 'Register Warehouse') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; gap: 1rem; }
    .subtitle { margin: 0.35rem 0 0; color: var(--text-muted); max-width: 48rem; }
    .status-banner { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.85rem; flex-wrap: wrap; }
    .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 800; background: rgba(74, 124, 68, 0.14); border: 1px solid rgba(74, 124, 68, 0.24); color: #9bd38e; }
    .status-pill-inactive { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.24); color: #f87171; }
    .status-copy { color: var(--text-muted); font-size: 0.82rem; }
    .form-card { max-width: 800px; width: 100%; margin: 0 auto; padding: 2rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #a3a3a3; }
    .form-group input { padding: 0.75rem; background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem; transition: border-color 0.2s; }
    .form-group input:focus { border-color: var(--primary); outline: none; }
    .form-actions { display: flex; justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .btn-danger { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
    .btn-success-alt { background: rgba(74, 124, 68, 0.14); border: 1px solid rgba(74, 124, 68, 0.3); color: #9bd38e; }
    .error { color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; }
      .header .btn { width: 100%; }
      .form-card { padding: 1.25rem; }
      .form-actions { flex-direction: column-reverse; align-items: stretch; }
      .form-actions .btn { width: 100%; }
    }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class WarehouseFormComponent implements OnInit {
  warehouseForm: FormGroup;
  loading = false;
  editMode = false;
  warehouseId?: number;
  warehouseActive = true;

  constructor(
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.warehouseForm = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      totalStorageCapacity: [null, Validators.min(0)],
      managerName: [''],
      contactPhone: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.warehouseId = +id;
      this.loadWarehouse(this.warehouseId);
    }
  }

  loadWarehouse(id: number): void {
    this.loading = true;
    this.warehouseService.getWarehouseById(id).subscribe({
      next: (wh) => {
        this.warehouseForm.patchValue(wh);
        this.warehouseActive = wh.active ?? true;
        this.loading = false;
      },
      error: () => {
        this.toastService.show('Error loading warehouse data', 'error');
        this.router.navigate(['/warehouses']);
      }
    });
  }

  onSubmit(): void {
    if (this.warehouseForm.invalid) return;

    this.loading = true;
    const warehouseData = this.warehouseForm.value;

    const request = this.editMode && this.warehouseId
      ? this.warehouseService.updateWarehouse(this.warehouseId, warehouseData)
      : this.warehouseService.createWarehouse(warehouseData);

    request.subscribe({
      next: () => {
        this.toastService.show(`Warehouse ${this.editMode ? 'updated' : 'registered'} successfully`, 'success');
        this.router.navigate(['/warehouses']);
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Failed to save warehouse', 'error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/warehouses']);
  }

  isAdmin(): boolean {
    return this.authService.currentUserValue?.role === 'ADMIN';
  }

  canManageWarehouses(): boolean {
    return this.authService.canManageWarehouses();
  }

  deactivateWarehouse(): void {
    if (!this.warehouseId) {
      return;
    }
    this.loading = true;
    this.warehouseService.deactivateWarehouse(this.warehouseId).subscribe({
      next: () => {
        this.toastService.show('Warehouse deactivated successfully', 'success');
        this.router.navigate(['/warehouses']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.show(err.error?.message || 'Failed to deactivate warehouse', 'error');
      }
    });
  }

  reactivateWarehouse(): void {
    if (!this.warehouseId) {
      return;
    }
    this.loading = true;
    this.warehouseService.reactivateWarehouse(this.warehouseId).subscribe({
      next: (warehouse) => {
        this.warehouseActive = warehouse.active ?? true;
        this.toastService.show('Warehouse reactivated successfully', 'success');
        this.router.navigate(['/warehouses']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.show(err.error?.message || 'Failed to reactivate warehouse', 'error');
      }
    });
  }
}
