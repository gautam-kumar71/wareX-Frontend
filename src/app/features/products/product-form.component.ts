import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="header">
      <h2>{{ editMode ? 'Edit' : 'Create' }} Product</h2>
      <button class="btn btn-secondary" (click)="goBack()">Cancel</button>
    </div>

    <div class="card form-card">
      <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Product Name</label>
            <input type="text" id="name" formControlName="name" maxlength="255" placeholder="e.g. Wireless Mouse">
            <div class="error" *ngIf="showFieldError('name', 'required')">Name is required</div>
            <div class="error" *ngIf="showFieldError('name', 'maxlength')">Name cannot exceed 255 characters</div>
          </div>

          <div class="form-group">
            <label for="sku">SKU</label>
            <input type="text" id="sku" formControlName="sku" maxlength="100" placeholder="MOU-WIR-001">
            <div class="error" *ngIf="showFieldError('sku', 'required')">SKU is required</div>
            <div class="error" *ngIf="showFieldError('sku', 'maxlength')">SKU cannot exceed 100 characters</div>
          </div>

          <div class="form-group">
            <label for="category">Category</label>
            <input type="text" id="category" formControlName="category" maxlength="100" placeholder="Electronics">
            <div class="error" *ngIf="showFieldError('category', 'maxlength')">Category cannot exceed 100 characters</div>
          </div>

          <div class="form-group">
            <label for="price">Selling Price</label>
            <input type="number" id="price" formControlName="price" placeholder="49.99">
          </div>

          <div class="form-group">
            <label for="costPrice">Cost Price</label>
            <input type="number" id="costPrice" formControlName="costPrice" placeholder="20.00">
          </div>

          <div class="form-group">
            <label for="taxRate">Tax Rate (%)</label>
            <input type="number" id="taxRate" formControlName="taxRate" placeholder="18.0">
          </div>

          <div class="form-group">
            <label for="weight">Weight</label>
            <input type="number" id="weight" formControlName="weight" placeholder="0.5" min="0" step="0.01">
            <div class="error" *ngIf="showFieldError('weight', 'min')">Weight cannot be negative</div>
          </div>

          <div class="form-group">
            <label for="weightUnit">Weight Unit</label>
            <select id="weightUnit" formControlName="weightUnit">
              <option value="">Select weight unit</option>
              <option *ngFor="let unit of weightUnitOptions" [value]="unit">{{ unit }}</option>
            </select>
            <div class="error" *ngIf="showFieldError('weightUnit', 'requiredWithWeight')">Weight unit is required when weight is provided</div>
          </div>

          <div class="form-group">
            <label for="length">Length</label>
            <input type="number" id="length" formControlName="length" placeholder="10" min="0" step="0.01">
            <div class="error" *ngIf="showFieldError('length', 'min')">Length cannot be negative</div>
          </div>

          <div class="form-group">
            <label for="width">Width</label>
            <input type="number" id="width" formControlName="width" placeholder="5" min="0" step="0.01">
            <div class="error" *ngIf="showFieldError('width', 'min')">Width cannot be negative</div>
          </div>

          <div class="form-group">
            <label for="height">Height</label>
            <input type="number" id="height" formControlName="height" placeholder="2" min="0" step="0.01">
            <div class="error" *ngIf="showFieldError('height', 'min')">Height cannot be negative</div>
          </div>

          <div class="form-group">
            <label for="dimensionUnit">Dimension Unit</label>
            <select id="dimensionUnit" formControlName="dimensionUnit">
              <option value="">Select dimension unit</option>
              <option *ngFor="let unit of dimensionUnitOptions" [value]="unit">{{ unit }}</option>
            </select>
            <div class="error" *ngIf="showFieldError('dimensionUnit', 'requiredWithDimension')">Dimension unit is required when any dimension is provided</div>
          </div>

          <div class="form-group full-width">
            <label for="description">Description</label>
            <textarea id="description" formControlName="description" rows="3" maxlength="2000" placeholder="Product details..."></textarea>
            <div class="error" *ngIf="showFieldError('description', 'maxlength')">Description cannot exceed 2000 characters</div>
          </div>

          <div class="form-group" *ngIf="editMode">
            <label for="active">Status</label>
            <select id="active" formControlName="active">
              <option [ngValue]="true">Active</option>
              <option [ngValue]="false">Inactive</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-danger" *ngIf="editMode && productId && canDeactivate()" [disabled]="loading" (click)="deactivateProduct()">
            Deactivate Product
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="productForm.invalid || loading">
            {{ loading ? 'Processing...' : (editMode ? 'Update Product' : 'Create Product') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .form-card { max-width: 800px; width: 100%; margin: 0 auto; padding: 2rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .full-width { grid-column: 1 / -1; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #a3a3a3; }
    .form-group input, .form-group textarea, .form-group select { padding: 0.75rem; background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem; transition: border-color 0.2s; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--primary); outline: none; }
    .form-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .btn-danger { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
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
export class ProductFormComponent implements OnInit {
  readonly weightUnitOptions = ['mg', 'g', 'kg', 'lb', 'oz'];
  readonly dimensionUnitOptions = ['mm', 'cm', 'm', 'in', 'ft'];
  productForm: FormGroup;
  loading = false;
  editMode = false;
  productId?: number;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      sku: ['', [Validators.required, Validators.maxLength(100)]],
      category: ['', Validators.maxLength(100)],
      price: [null, [Validators.min(0)]],
      costPrice: [null, [Validators.min(0)]],
      taxRate: [null, [Validators.min(0)]],
      weight: [null, [Validators.min(0)]],
      weightUnit: [''],
      dimensionUnit: [''],
      length: [null, [Validators.min(0)]],
      width: [null, [Validators.min(0)]],
      height: [null, [Validators.min(0)]],
      description: ['', Validators.maxLength(2000)],
      active: [true]
    }, {
      validators: [
        this.weightUnitRequiredValidator(),
        this.dimensionUnitRequiredValidator()
      ]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.productId = +id;
      this.loadProduct(this.productId);
    }
  }

  loadProduct(id: number): void {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (prod) => {
        const legacyUnit = (prod.unit ?? '').trim().toLowerCase();
        this.productForm.patchValue({
          ...prod,
          weightUnit: prod.weightUnit ?? (this.weightUnitOptions.includes(legacyUnit) ? legacyUnit : ''),
          dimensionUnit: prod.dimensionUnit ?? (this.dimensionUnitOptions.includes(legacyUnit) ? legacyUnit : '')
        });
        this.loading = false;
      },
      error: () => {
        this.toastService.show('Error loading product data', 'error');
        this.router.navigate(['/products']);
      }
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const productData = {
      ...this.productForm.value,
      weightUnit: this.normalizeOptionalUnit(this.productForm.value.weightUnit),
      dimensionUnit: this.normalizeOptionalUnit(this.productForm.value.dimensionUnit),
      unit: null
    };

    const request = this.editMode && this.productId
      ? this.productService.updateProduct(this.productId, productData)
      : this.productService.createProduct(productData);

    request.subscribe({
      next: () => {
        this.toastService.show(`Product ${this.editMode ? 'updated' : 'created'} successfully`, 'success');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.show(err.error?.message || 'Error processing product', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/products']);
  }

  canDeactivate(): boolean {
    const role = this.authService.currentUserValue?.role;
    return role === 'ADMIN' || role === 'INVENTORY_MANAGER';
  }

  deactivateProduct(): void {
    if (!this.productId) {
      return;
    }
    this.loading = true;
    this.productService.deleteProduct(this.productId).subscribe({
      next: () => {
        this.toastService.show('Product deactivated successfully', 'success');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading = false;
        this.toastService.show(err.error?.message || 'Failed to deactivate product', 'error');
      }
    });
  }

  showFieldError(controlName: string, errorKey: string): boolean {
    const control = this.productForm.get(controlName);
    if (!control) {
      return false;
    }

    const touched = control.touched || control.dirty;
    return touched && (!!control.errors?.[errorKey] || !!this.productForm.errors?.[errorKey]);
  }

  private weightUnitRequiredValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const weight = group.get('weight')?.value;
      const weightUnitControl = group.get('weightUnit');
      const weightUnit = this.normalizeOptionalUnit(weightUnitControl?.value);

      if (weight != null && weight !== '' && weightUnit == null) {
        weightUnitControl?.setErrors({ ...(weightUnitControl.errors ?? {}), requiredWithWeight: true });
        return { requiredWithWeight: true };
      }

      if (weightUnitControl?.errors?.['requiredWithWeight']) {
        const { requiredWithWeight, ...rest } = weightUnitControl.errors;
        weightUnitControl.setErrors(Object.keys(rest).length ? rest : null);
      }

      return null;
    };
  }

  private dimensionUnitRequiredValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const hasDimension = ['length', 'width', 'height'].some(field => {
        const value = group.get(field)?.value;
        return value != null && value !== '';
      });
      const dimensionUnitControl = group.get('dimensionUnit');
      const dimensionUnit = this.normalizeOptionalUnit(dimensionUnitControl?.value);

      if (hasDimension && dimensionUnit == null) {
        dimensionUnitControl?.setErrors({ ...(dimensionUnitControl.errors ?? {}), requiredWithDimension: true });
        return { requiredWithDimension: true };
      }

      if (dimensionUnitControl?.errors?.['requiredWithDimension']) {
        const { requiredWithDimension, ...rest } = dimensionUnitControl.errors;
        dimensionUnitControl.setErrors(Object.keys(rest).length ? rest : null);
      }

      return null;
    };
  }

  private normalizeOptionalUnit(value: string | null | undefined): string | null {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
  }
}
