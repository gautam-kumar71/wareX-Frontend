import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductListComponent } from './product-list.component';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let productService: { getProducts: jest.Mock };
  let authService: { canManageProducts: jest.Mock };

  beforeEach(async () => {
    productService = {
      getProducts: jest.fn()
    };
    authService = {
      canManageProducts: jest.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('loads products on init and clears loading state', () => {
    productService.getProducts.mockReturnValue(of({
      content: [{ id: 1, name: 'Widget', sku: 'SKU-1', active: true, unit: 'kg' }]
    }));

    component.ngOnInit();

    expect(productService.getProducts).toHaveBeenCalled();
    expect(component.products).toHaveLength(1);
    expect(component.loading).toBe(false);
    expect(component.serviceError).toBe(false);
  });

  it('marks the service unavailable for gateway and network failures', () => {
    productService.getProducts.mockReturnValue(throwError(() => ({ status: 503 })));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    component.loadProducts();

    expect(component.loading).toBe(false);
    expect(component.serviceError).toBe(true);
    errorSpy.mockRestore();
  });

  it('keeps serviceError false for non-availability errors', () => {
    productService.getProducts.mockReturnValue(throwError(() => ({ status: 400 })));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    component.loadProducts();

    expect(component.loading).toBe(false);
    expect(component.serviceError).toBe(false);
    errorSpy.mockRestore();
  });

  it('delegates product permissions to AuthService', () => {
    authService.canManageProducts.mockReturnValue(false);

    expect(component.canManageProducts()).toBe(false);
  });

  it('derives unit labels from explicit units legacy units and defaults', () => {
    expect(component.weightUnitLabel({ id: 1, name: 'A', sku: 'A', active: true, weightUnit: 'lb' })).toBe('lb');
    expect(component.weightUnitLabel({ id: 1, name: 'A', sku: 'A', active: true, unit: ' G ' })).toBe('g');
    expect(component.weightUnitLabel({ id: 1, name: 'A', sku: 'A', active: true, unit: 'cm' })).toBe('kg');

    expect(component.dimensionUnitLabel({ id: 2, name: 'B', sku: 'B', active: true, dimensionUnit: 'ft' })).toBe('ft');
    expect(component.dimensionUnitLabel({ id: 2, name: 'B', sku: 'B', active: true, unit: ' MM ' })).toBe('mm');
    expect(component.dimensionUnitLabel({ id: 2, name: 'B', sku: 'B', active: true, unit: 'kg' })).toBe('cm');
  });
});
