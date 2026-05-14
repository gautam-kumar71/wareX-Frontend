import { of, throwError } from 'rxjs';
import { SupplierListComponent } from './supplier-list.component';

describe('SupplierListComponent', () => {
  const basePage = {
    content: [
      {
        id: 1,
        name: 'Northwind',
        contactEmail: 'northwind@warex.com',
        contactPhone: '111',
        city: 'Pune',
        country: 'India',
        category: 'RAW_MATERIALS',
        active: true
      },
      {
        id: 2,
        name: 'Dormant',
        contactEmail: 'dormant@warex.com',
        contactPhone: '222',
        city: 'Delhi',
        country: 'India',
        category: 'GENERAL',
        active: false
      }
    ],
    totalPages: 3,
    number: 1,
    totalElements: 42
  };

  it('loads suppliers search filters and pagination state', () => {
    const supplierService = {
      getSuppliers: jest.fn().mockReturnValue(of(basePage)),
      searchSuppliers: jest.fn().mockReturnValue(of({ ...basePage, totalElements: 1 })),
      getDeactivationCheck: jest.fn(),
      reactivateSupplier: jest.fn(),
      deleteSupplier: jest.fn()
    };
    const toastService = {
      error: jest.fn(),
      success: jest.fn()
    };
    const authService = {
      currentUserValue: { role: 'ADMIN' }
    };
    const component = new SupplierListComponent(supplierService as any, toastService as any, authService as any);

    component.ngOnInit();
    expect(supplierService.getSuppliers).toHaveBeenCalledWith(0, 20, undefined);
    expect(component.activeCount).toBe(1);
    expect(component.inactiveCount).toBe(1);

    component.searchQuery = 'north';
    component.statusFilter = 'active';
    component.onSearch();
    expect(supplierService.searchSuppliers).toHaveBeenCalledWith('north', 0, 20, true);

    component.changePage(2);
    expect(supplierService.searchSuppliers).toHaveBeenCalledWith('north', 2, 20, true);

    component.clearFilters();
    expect(component.searchQuery).toBe('');
    expect(component.statusFilter).toBe('all');
    expect(component.formatCategory('RAW_MATERIALS')).toBe('Raw Materials');
    expect(component.formatCategory()).toBe('Uncategorized');
    expect(component.formatStatusList(['PARTIALLY_RECEIVED', 'APPROVED'])).toBe('Partially Received, Approved');
  });

  it('handles service outages delete flows and reactivation flows', () => {
    const supplierService = {
      getSuppliers: jest.fn().mockReturnValue(throwError(() => ({ status: 503 }))),
      searchSuppliers: jest.fn(),
      getDeactivationCheck: jest.fn(),
      reactivateSupplier: jest.fn(),
      deleteSupplier: jest.fn()
    };
    const toastService = {
      error: jest.fn(),
      success: jest.fn()
    };
    const authService = {
      currentUserValue: { role: 'ADMIN' }
    };
    const component = new SupplierListComponent(supplierService as any, toastService as any, authService as any);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const confirmSpy = jest.spyOn(global, 'confirm').mockReturnValue(true);

    component.loadSuppliers();
    expect(component.serviceError).toBe(true);

    const activeSupplier = {
      id: 9,
      name: 'Active',
      contactEmail: 'active@warex.com',
      contactPhone: '9',
      city: 'Pune',
      country: 'India',
      category: 'GENERAL',
      active: true
    };

    supplierService.getDeactivationCheck.mockReturnValue(of({
      canDeactivate: true,
      blockingOrderCount: 0,
      blockingStatuses: [],
      blockingOrderNumbers: [],
      blockingInvoiceCount: 0,
      blockingInvoiceStatuses: [],
      blockingInvoiceNumbers: []
    }));
    component.deleteSupplier(activeSupplier);
    expect(component.deleteDialogOpen).toBe(true);
    expect(component.deleteCheck?.canDeactivate).toBe(true);

    supplierService.deleteSupplier.mockReturnValue(of(undefined));
    component.confirmDeleteSupplier();
    expect(toastService.success).toHaveBeenCalledWith('Supplier deactivated successfully');

    const inactiveSupplier = { ...activeSupplier, id: 10, active: false };
    supplierService.reactivateSupplier.mockReturnValue(of(undefined));
    component.reactivateSupplier(inactiveSupplier);
    expect(supplierService.reactivateSupplier).toHaveBeenCalledWith(10);
    expect(toastService.success).toHaveBeenCalledWith('Supplier reactivated successfully');

    supplierService.reactivateSupplier.mockReturnValue(throwError(() => ({ error: {} })));
    component.reactivateSupplier(inactiveSupplier);
    expect(toastService.error).toHaveBeenCalledWith('Failed to reactivate supplier');

    component.closeDeleteDialog();
    expect(component.deleteDialogOpen).toBe(false);
    expect(component.canDeleteSuppliers()).toBe(true);

    errorSpy.mockRestore();
    confirmSpy.mockRestore();
  });
});
