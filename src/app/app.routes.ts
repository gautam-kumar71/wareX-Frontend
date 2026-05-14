import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'oauth2/success',
    loadComponent: () => import('./features/auth/oauth2-success.component').then(m => m.OAuth2SuccessComponent)
  },
  {
    path: 'oauth2/failure',
    loadComponent: () => import('./features/auth/oauth2-failure.component').then(m => m.OAuth2FailureComponent)
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'orders',
    redirectTo: 'purchase-orders',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'warehouses',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/warehouses/warehouse-list.component').then(m => m.WarehouseListComponent)
      },
      {
        path: 'new',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER'] },
        loadComponent: () => import('./features/warehouses/warehouse-form.component').then(m => m.WarehouseFormComponent)
      },
      {
        path: ':id/edit',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER'] },
        loadComponent: () => import('./features/warehouses/warehouse-form.component').then(m => m.WarehouseFormComponent)
      }
    ]
  },
  {
    path: 'products',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'new',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER'] },
        loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: ':id/edit',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER'] },
        loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent)
      }
    ]
  },
  {
    path: 'suppliers',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'PURCHASE_OFFICER'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/suppliers/supplier-list.component').then(m => m.SupplierListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./features/suppliers/supplier-form.component').then(m => m.SupplierFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/suppliers/supplier-form.component').then(m => m.SupplierFormComponent)
      }
    ]
  },
  {
    path: 'purchase-orders',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/purchase-orders/order-list.component').then(m => m.OrderListComponent)
      },
      {
        path: 'new',
        canActivate: [authGuard],
        data: { expectedRoles: ['ADMIN', 'PURCHASE_OFFICER'] },
        loadComponent: () => import('./features/purchase-orders/order-form.component').then(m => m.OrderFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/purchase-orders/order-detail.component').then(m => m.OrderDetailComponent)
      }
    ]
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'PURCHASE_OFFICER'] },
    loadComponent: () => import('./features/payments/payment-hub.component').then(m => m.PaymentHubComponent)
  },
  {
    path: 'stock',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF'] },
    loadComponent: () => import('./features/stock/stock-control.component').then(m => m.StockControlComponent)
  },
  {
    path: 'stock-movements',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF'] },
    loadComponent: () => import('./features/stock-movements/stock-movement-list.component').then(m => m.StockMovementListComponent)
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF'] },
    loadComponent: () => import('./features/alerts/alert-list.component').then(m => m.AlertListComponent)
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN', 'INVENTORY_MANAGER', 'PURCHASE_OFFICER', 'WAREHOUSE_STAFF'] },
    loadComponent: () => import('./features/reports/report-dashboard.component').then(m => m.ReportDashboardComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'admin/users',
    canActivate: [authGuard],
    data: { expectedRoles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/admin-user-list.component').then(m => m.AdminUserListComponent)
  },
  {
    path: 'api-docs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/api-docs.component').then(m => m.ApiDocsComponent)
  }
];
