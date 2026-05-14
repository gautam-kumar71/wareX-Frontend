import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { WarehouseListComponent } from './warehouse-list.component';

describe('WarehouseListComponent', () => {
  const fb = new FormBuilder();

  const createComponent = () => {
    const warehouseService = {
      getWarehouses: jest.fn()
    };
    const stockService = {
      getStockByWarehouse: jest.fn(),
      transferStock: jest.fn()
    };
    const orderService = {
      getOrders: jest.fn()
    };
    const toastService = {
      error: jest.fn(),
      success: jest.fn()
    };
    const authService = {
      canManageWarehouses: jest.fn().mockReturnValue(true)
    };

    return {
      component: new WarehouseListComponent(
        warehouseService as any,
        stockService as any,
        orderService as any,
        toastService as any,
        fb,
        authService as any
      ),
      warehouseService,
      stockService,
      orderService,
      toastService,
      authService
    };
  };

  it('loads warehouses derives summaries and handles transfer planning', () => {
    const { component, warehouseService, stockService, orderService, toastService, authService } = createComponent();
    const warehouses = [
      {
        id: 1,
        name: 'Alpha',
        location: 'Dock',
        city: 'Pune',
        country: 'India',
        active: true,
        totalStorageCapacity: 100,
        currentCapacityUtilization: 95,
        lowStockItemCount: 2,
        overstockItemCount: 1,
        suggestedTransferWarehouseId: 2,
        suggestedTransferWarehouseName: 'Beta',
        suggestedTransferFreeCapacity: 40
      },
      {
        id: 2,
        name: 'Beta',
        location: 'Hub',
        city: 'Delhi',
        country: 'India',
        active: true,
        totalStorageCapacity: 200,
        currentCapacityUtilization: 60
      }
    ];

    warehouseService.getWarehouses.mockReturnValue(of(warehouses));
    orderService.getOrders
      .mockReturnValueOnce(of({ content: [{ status: 'APPROVED', orderNumber: 'PO-1' }, { status: 'CANCELLED', orderNumber: 'PO-X' }] }))
      .mockReturnValueOnce(of({ content: [] }));

    component.ngOnInit();
    expect(component.warehouses).toHaveLength(2);
    expect(component.activeWarehouseCount).toBe(2);
    expect(component.lowStockWarehouseCount).toBe(1);
    expect(component.highCapacityWarehouseCount).toBe(1);
    expect(component.openInboundOrderCounts[1]).toBe(1);
    expect(component.latestInboundOrderNumbers[1]).toBe('PO-1');
    expect(component.getCapacityPercent(warehouses[0])).toBe(95);
    expect(component.getCapacityClass(warehouses[0])).toBe('cap-danger');
    expect(component.getCapacityClass({ ...warehouses[0], capacityPercent: 80 })).toBe('cap-warn');
    expect(component.getCapacityClass({ ...warehouses[0], capacityPercent: 40 })).toBe('cap-safe');
    expect(component.estimateFreeCapacity(warehouses[1])).toBe(140);
    expect(component.canManageWarehouses()).toBe(true);
    expect(authService.canManageWarehouses).toHaveBeenCalled();

    stockService.getStockByWarehouse.mockReturnValue(of([
      { productId: 100, productName: 'Widget', availableQty: 10, quantity: 20, maxCapacity: 15, overstock: true, lowStock: false },
      { productId: 101, productName: 'Gadget', availableQty: 5, quantity: 5, overstock: false, lowStock: true }
    ]));
    component.openTransferPlanner(warehouses[0] as any);
    expect(component.transferDialogOpen).toBe(true);
    expect(component.transferCandidates[0].productId).toBe(100);
    expect(component.selectedTransferCandidate?.productId).toBe(100);
    expect(component.transferForm.value.destinationWarehouseId).toBe(2);
    expect(component.selectedDestinationWarehouse?.id).toBe(2);
    expect(component.transferCandidateEmptyMessage).toContain('movable stock');

    component.selectTransferCandidate({ productId: 101, availableQty: 5, quantity: 5, lowStock: true, overstock: false } as any);
    expect(component.transferForm.value.productId).toBe(101);
    expect(component.transferForm.value.quantity).toBe(3);

    stockService.transferStock.mockReturnValue(of(undefined));
    component.transferForm.patchValue({ productId: 101, destinationWarehouseId: 2, quantity: 3, referenceId: 'MOVE-1' });
    component.submitTransfer();
    expect(stockService.transferStock).toHaveBeenCalledWith({
      productId: 101,
      sourceWarehouseId: 1,
      destinationWarehouseId: 2,
      quantity: 3,
      referenceId: 'MOVE-1'
    });
    expect(toastService.success).toHaveBeenCalledWith('Stock transferred successfully');

    component.closeTransferDialog();
    expect(component.transferDialogOpen).toBe(false);
  });

  it('handles warehouse loading and transfer failures gracefully', () => {
    const { component, warehouseService, stockService, orderService, toastService } = createComponent();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    warehouseService.getWarehouses.mockReturnValue(throwError(() => ({ status: 503 })));
    component.loadWarehouses();
    expect(component.serviceError).toBe(true);

    warehouseService.getWarehouses.mockReturnValue(of([{ name: 'NoId', location: 'A', city: 'Pune', country: 'India', active: true }]));
    orderService.getOrders.mockReturnValue(of({ content: [] }));
    component.loadWarehouses();
    expect(component.openInboundOrderCounts).toEqual({});

    component.openTransferPlanner({ name: 'NoId', location: 'A', city: 'Pune', country: 'India', active: true } as any);
    expect(component.transferDialogOpen).toBe(false);

    component.warehouses = [
      { id: 1, name: 'Alpha', location: 'Dock', city: 'Pune', country: 'India', active: true },
      { id: 2, name: 'Beta', location: 'Hub', city: 'Delhi', country: 'India', active: true }
    ] as any;
    stockService.getStockByWarehouse.mockReturnValue(throwError(() => ({ error: {} })));
    component.openTransferPlanner(component.warehouses[0]);
    expect(toastService.error).toHaveBeenCalledWith('Failed to load transferable stock');

    component.transferDialogOpen = true;
    component.transferSourceWarehouse = component.warehouses[0];
    component.selectedTransferCandidate = { productId: 100, availableQty: 5 } as any;
    component.transferForm.patchValue({ productId: 100, destinationWarehouseId: '0', quantity: 2 });
    component.submitTransfer();
    expect(toastService.error).toHaveBeenCalledWith('Choose a destination warehouse before transferring');

    component.transferForm.patchValue({ destinationWarehouseId: 2, quantity: 10 });
    component.submitTransfer();
    expect(toastService.error).toHaveBeenCalledWith('Transfer quantity cannot be greater than the available stock');

    component.transferForm.patchValue({ quantity: 2 });
    stockService.transferStock.mockReturnValue(throwError(() => ({ error: {} })));
    component.submitTransfer();
    expect(toastService.error).toHaveBeenCalledWith('Failed to transfer stock');

    errorSpy.mockRestore();
  });
});
