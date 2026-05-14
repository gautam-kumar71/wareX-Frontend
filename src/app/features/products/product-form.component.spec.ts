import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProductFormComponent } from './product-form.component';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;
  let productService: {
    getProductById: jest.Mock;
    createProduct: jest.Mock;
    updateProduct: jest.Mock;
    deleteProduct: jest.Mock;
  };
  let toastService: { show: jest.Mock };
  let router: { navigate: jest.Mock };
  let authService: { currentUserValue: { role?: string } | null };
  let routeId: string | null;

  beforeEach(async () => {
    routeId = null;
    productService = {
      getProductById: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn()
    };
    toastService = {
      show: jest.fn()
    };
    router = {
      navigate: jest.fn()
    };
    authService = {
      currentUserValue: { role: 'ADMIN' }
    };

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            get snapshot() {
              return {
                paramMap: convertToParamMap(routeId ? { id: routeId } : {})
              };
            }
          }
        },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
  });

  it('stays in create mode when the route has no id', () => {
    component.ngOnInit();

    expect(component.editMode).toBe(false);
    expect(productService.getProductById).not.toHaveBeenCalled();
  });

  it('loads an existing product and normalizes legacy units in edit mode', () => {
    routeId = '7';
    productService.getProductById.mockReturnValue(of({
      id: 7,
      name: 'Widget',
      sku: 'SKU-7',
      weight: 2,
      length: 10,
      width: 5,
      height: 1,
      unit: ' CM ',
      active: true
    }));

    component.ngOnInit();

    expect(component.editMode).toBe(true);
    expect(component.productId).toBe(7);
    expect(productService.getProductById).toHaveBeenCalledWith(7);
    expect(component.productForm.value.dimensionUnit).toBe('cm');
    expect(component.productForm.value.weightUnit).toBe('');
    expect(component.loading).toBe(false);
  });

  it('shows an error and navigates back when loadProduct fails', () => {
    productService.getProductById.mockReturnValue(throwError(() => new Error('boom')));

    component.loadProduct(4);

    expect(toastService.show).toHaveBeenCalledWith('Error loading product data', 'error');
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });

  it('marks fields as touched instead of submitting invalid forms', () => {
    component.productForm.patchValue({ name: '', sku: '' });
    const touchSpy = jest.spyOn(component.productForm, 'markAllAsTouched');

    component.onSubmit();

    expect(touchSpy).toHaveBeenCalled();
    expect(productService.createProduct).not.toHaveBeenCalled();
    expect(productService.updateProduct).not.toHaveBeenCalled();
  });

  it('creates a product with normalized units and clears the legacy unit field', () => {
    productService.createProduct.mockReturnValue(of({ id: 8, name: 'Created', sku: 'SKU-8', active: true }));
    component.productForm.patchValue({
      name: 'Created',
      sku: 'SKU-8',
      weight: 2,
      weightUnit: ' KG ',
      length: 5,
      dimensionUnit: ' CM ',
      active: true
    });

    component.onSubmit();

    expect(productService.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Created',
      sku: 'SKU-8',
      weightUnit: 'kg',
      dimensionUnit: 'cm',
      unit: null
    }));
    expect(toastService.show).toHaveBeenCalledWith('Product created successfully', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });

  it('updates an existing product in edit mode', () => {
    component.editMode = true;
    component.productId = 12;
    productService.updateProduct.mockReturnValue(of({ id: 12, name: 'Updated', sku: 'SKU-12', active: true }));
    component.productForm.patchValue({
      name: 'Updated',
      sku: 'SKU-12',
      active: true
    });

    component.onSubmit();

    expect(productService.updateProduct).toHaveBeenCalledWith(12, expect.objectContaining({
      name: 'Updated',
      sku: 'SKU-12',
      unit: null
    }));
    expect(toastService.show).toHaveBeenCalledWith('Product updated successfully', 'success');
  });

  it('surfaces backend errors during submit and deactivate', () => {
    component.productForm.patchValue({
      name: 'Broken',
      sku: 'SKU-B',
      active: true
    });
    productService.createProduct.mockReturnValue(throwError(() => ({ error: { message: 'Create failed' } })));

    component.onSubmit();

    expect(component.loading).toBe(false);
    expect(toastService.show).toHaveBeenCalledWith('Create failed', 'error');

    component.productId = 14;
    productService.deleteProduct.mockReturnValue(throwError(() => ({ error: {} })));

    component.deactivateProduct();

    expect(component.loading).toBe(false);
    expect(toastService.show).toHaveBeenCalledWith('Failed to deactivate product', 'error');
  });

  it('deactivates an existing product and respects role-based access', () => {
    productService.deleteProduct.mockReturnValue(of(undefined));
    component.productId = 9;

    expect(component.canDeactivate()).toBe(true);

    component.deactivateProduct();

    expect(productService.deleteProduct).toHaveBeenCalledWith(9);
    expect(toastService.show).toHaveBeenCalledWith('Product deactivated successfully', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/products']);

    authService.currentUserValue = { role: 'PURCHASE_OFFICER' };
    expect(component.canDeactivate()).toBe(false);
  });

  it('validates dependent unit fields and helper methods', () => {
    component.productForm.patchValue({ weight: 1, weightUnit: '' });
    component.productForm.get('weight')?.markAsTouched();
    component.productForm.get('weightUnit')?.markAsDirty();
    component.productForm.updateValueAndValidity();

    expect(component.productForm.errors?.['requiredWithWeight']).toBe(true);
    expect(component.showFieldError('weightUnit', 'requiredWithWeight')).toBe(true);

    component.productForm.patchValue({ weight: 1, weightUnit: ' g ', length: 12, dimensionUnit: '' });
    component.productForm.get('dimensionUnit')?.markAsDirty();
    component.productForm.updateValueAndValidity();

    expect(component.productForm.errors?.['requiredWithDimension']).toBe(true);
    expect(component.showFieldError('dimensionUnit', 'requiredWithDimension')).toBe(true);
    expect(component.showFieldError('missing', 'anything')).toBe(false);
  });
});
