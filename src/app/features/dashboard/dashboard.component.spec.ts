import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('loads dashboard stats and allows order creation for supported roles', () => {
    const authService = {
      currentUser$: of({ fullName: 'Asha', email: 'asha@warex.com', role: 'ADMIN' }),
      currentUserValue: { role: 'ADMIN' }
    };
    const reportService = {
      getDashboardStats: jest.fn().mockReturnValue(of({ totalWarehouses: 3, activeSuppliers: 7, shipments: 11, openOrders: 4, totalValue: 15000 }))
    };

    const component = new DashboardComponent(authService as any, reportService as any);

    expect(reportService.getDashboardStats).toHaveBeenCalled();
    expect(component.canCreateOrder()).toBe(true);

    authService.currentUserValue = { role: 'WAREHOUSE_STAFF' };
    expect(component.canCreateOrder()).toBe(false);
  });
});
