import { FormBuilder } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarehouseFormComponent } from './warehouse-form.component';

describe('WarehouseFormComponent', () => {
  const fb = new FormBuilder();

  const createComponent = (routeId: string | null = null) => {
    const warehouseService = {
      getWarehouseById: jest.fn(),
      createWarehouse: jest.fn(),
      updateWarehouse: jest.fn(),
      deactivateWarehouse: jest.fn(),
      reactivateWarehouse: jest.fn()
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
      currentUserValue: { role: 'ADMIN' },
      canManageWarehouses: jest.fn().mockReturnValue(true)
    };

    return {
      component: new WarehouseFormComponent(
        fb,
        warehouseService as any,
        toastService as any,
        router as any,
        route as any,
        authService as any
      ),
      warehouseService,
      toastService,
      router,
      authService
    };
  };

  it('supports create and edit save flows', () => {
    const { component, warehouseService, toastService, router, authService } = createComponent();

    component.onSubmit();
    expect(warehouseService.createWarehouse).not.toHaveBeenCalled();

    warehouseService.createWarehouse.mockReturnValue(of({}));
    component.warehouseForm.patchValue({
      name: 'Central',
      location: 'Dock',
      city: 'Pune',
      country: 'India'
    });
    component.onSubmit();
    expect(warehouseService.createWarehouse).toHaveBeenCalled();
    expect(toastService.show).toHaveBeenCalledWith('Warehouse registered successfully', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/warehouses']);
    expect(component.canManageWarehouses()).toBe(true);
    expect(component.isAdmin()).toBe(true);

    authService.currentUserValue = { role: 'WAREHOUSE_STAFF' };
    expect(component.isAdmin()).toBe(false);

    const edit = createComponent('8');
    edit.warehouseService.getWarehouseById.mockReturnValue(of({
      id: 8,
      name: 'Old',
      location: 'A',
      city: 'Delhi',
      country: 'India',
      active: false
    }));
    edit.component.ngOnInit();
    expect(edit.component.editMode).toBe(true);
    expect(edit.component.warehouseActive).toBe(false);

    edit.warehouseService.updateWarehouse.mockReturnValue(of({}));
    edit.component.onSubmit();
    expect(edit.warehouseService.updateWarehouse).toHaveBeenCalledWith(8, expect.anything());
  });

  it('handles load save deactivate and reactivate failures', () => {
    const { component, warehouseService, toastService, router } = createComponent('5');

    warehouseService.getWarehouseById.mockReturnValue(throwError(() => new Error('bad')));
    component.loadWarehouse(5);
    expect(toastService.show).toHaveBeenCalledWith('Error loading warehouse data', 'error');
    expect(router.navigate).toHaveBeenCalledWith(['/warehouses']);

    warehouseService.createWarehouse.mockReturnValue(throwError(() => ({ error: { message: 'Save failed' } })));
    component.warehouseForm.patchValue({
      name: 'Bad',
      location: 'B',
      city: 'Pune',
      country: 'India'
    });
    component.onSubmit();
    expect(toastService.show).toHaveBeenCalledWith('Save failed', 'error');

    component.warehouseId = 5;
    warehouseService.deactivateWarehouse.mockReturnValue(throwError(() => ({ error: {} })));
    component.deactivateWarehouse();
    expect(toastService.show).toHaveBeenCalledWith('Failed to deactivate warehouse', 'error');

    warehouseService.reactivateWarehouse.mockReturnValue(of({ active: true }));
    component.reactivateWarehouse();
    expect(component.warehouseActive).toBe(true);
    expect(toastService.show).toHaveBeenCalledWith('Warehouse reactivated successfully', 'success');

    warehouseService.reactivateWarehouse.mockReturnValue(throwError(() => ({ error: {} })));
    component.reactivateWarehouse();
    expect(toastService.show).toHaveBeenCalledWith('Failed to reactivate warehouse', 'error');

    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/warehouses']);
  });
});
