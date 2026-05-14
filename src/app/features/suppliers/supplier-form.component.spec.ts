import { FormBuilder } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SupplierFormComponent } from './supplier-form.component';

describe('SupplierFormComponent', () => {
  const fb = new FormBuilder();

  const createComponent = (routeId: string | null = null) => {
    const supplierService = {
      getSupplierById: jest.fn(),
      createSupplier: jest.fn(),
      updateSupplier: jest.fn(),
      getDeactivationCheck: jest.fn(),
      reactivateSupplier: jest.fn(),
      deleteSupplier: jest.fn()
    };
    const toastService = {
      show: jest.fn()
    };
    const router = {
      navigate: jest.fn()
    };
    const route = {
      snapshot: {
        paramMap: convertToParamMap(routeId ? { id: routeId } : {})
      }
    };
    const authService = {
      currentUserValue: { role: 'ADMIN' }
    };

    return {
      component: new SupplierFormComponent(
        fb,
        supplierService as any,
        toastService as any,
        router as any,
        route as any,
        authService as any
      ),
      supplierService,
      toastService,
      router,
      authService
    };
  };

  it('supports create and edit submission flows', () => {
    const { component, supplierService, toastService, router, authService } = createComponent();

    component.onSubmit();
    expect(supplierService.createSupplier).not.toHaveBeenCalled();

    supplierService.createSupplier.mockReturnValue(of({}));
    component.supplierForm.patchValue({
      name: 'Northwind',
      category: 'GENERAL',
      contactEmail: 'northwind@warex.com',
      contactPhone: '111',
      address: 'Dock Road',
      city: 'Pune',
      country: 'India'
    });
    component.onSubmit();
    expect(supplierService.createSupplier).toHaveBeenCalled();
    expect(toastService.show).toHaveBeenCalledWith('Supplier registered successfully', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers']);

    const edit = createComponent('7');
    edit.supplierService.getSupplierById.mockReturnValue(of({
      id: 7,
      name: 'Existing',
      category: 'GENERAL',
      contactEmail: 'existing@warex.com',
      contactPhone: '999',
      address: 'A',
      city: 'Pune',
      country: 'India',
      active: false
    }));
    edit.component.ngOnInit();
    expect(edit.component.editMode).toBe(true);
    expect(edit.component.loadedSupplier?.id).toBe(7);

    edit.supplierService.updateSupplier.mockReturnValue(of({}));
    edit.component.onSubmit();
    expect(edit.supplierService.updateSupplier).toHaveBeenCalledWith(7, expect.anything());
    expect(edit.component.isAdmin()).toBe(true);
    expect(edit.component.formatStatusList(['PARTIALLY_RECEIVED'])).toBe('Partially Received');

    authService.currentUserValue = { role: 'PURCHASE_OFFICER' };
    expect(component.isAdmin()).toBe(false);
  });

  it('handles load save deactivate and reactivate failures', () => {
    const { component, supplierService, toastService, router } = createComponent('3');

    supplierService.getSupplierById.mockReturnValue(throwError(() => new Error('bad')));
    component.loadSupplier(3);
    expect(toastService.show).toHaveBeenCalledWith('Error loading supplier data', 'error');
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers']);

    supplierService.createSupplier.mockReturnValue(throwError(() => ({ error: { message: 'Save failed' } })));
    component.supplierForm.patchValue({
      name: 'Broken',
      category: 'GENERAL',
      contactEmail: 'broken@warex.com',
      contactPhone: '111',
      address: 'A',
      city: 'Pune',
      country: 'India'
    });
    component.onSubmit();
    expect(toastService.show).toHaveBeenCalledWith('Save failed', 'error');

    component.supplierId = 3;
    supplierService.getDeactivationCheck.mockReturnValue(of({
      canDeactivate: true,
      blockingOrderCount: 0,
      blockingStatuses: [],
      blockingOrderNumbers: [],
      blockingInvoiceCount: 0,
      blockingInvoiceStatuses: [],
      blockingInvoiceNumbers: []
    }));
    component.deactivateSupplier();
    expect(component.deleteDialogOpen).toBe(true);

    supplierService.deleteSupplier.mockReturnValue(throwError(() => ({ error: {} })));
    component.deleteCheck = { canDeactivate: true, blockingOrderCount: 0, blockingStatuses: [], blockingOrderNumbers: [], blockingInvoiceCount: 0, blockingInvoiceStatuses: [], blockingInvoiceNumbers: [] };
    component.confirmDeactivateSupplier();
    expect(toastService.show).toHaveBeenCalledWith('Failed to deactivate supplier', 'error');

    supplierService.reactivateSupplier.mockReturnValue(throwError(() => ({ error: {} })));
    component.reactivateSupplier();
    expect(toastService.show).toHaveBeenCalledWith('Failed to reactivate supplier', 'error');

    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/suppliers']);
    component.closeDeleteDialog();
    expect(component.deleteDialogOpen).toBe(false);
  });
});
