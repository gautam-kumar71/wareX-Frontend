import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { SupplierService } from './supplier.service';
import { WarehouseService } from './warehouse.service';
import { InvoiceService } from './invoice.service';
import { AlertService } from './alert.service';
import { StockMovementService } from './stock-movement.service';
import { ReportService } from './report.service';

describe('Catalog and reporting services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductService,
        SupplierService,
        WarehouseService,
        InvoiceService,
        AlertService,
        StockMovementService,
        ReportService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('ProductService builds list and mutation requests', () => {
    const service = TestBed.inject(ProductService);

    service.getProducts(2, 25, '  bolt  ', true).subscribe((page) => {
      expect(page.content[0].sku).toBe('SKU-1');
    });
    let req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/products?page=2&size=25&q=bolt&activeOnly=true'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 1, name: 'Bolt', sku: 'SKU-1', active: true }] } });

    service.getProductById(9).subscribe((product) => {
      expect(product.id).toBe(9);
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/products/9'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 9, name: 'Widget', sku: 'W-9', active: true } });

    service.createProduct({ name: 'New', sku: 'NEW-1', active: true }).subscribe((product) => {
      expect(product.name).toBe('New');
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/products'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 2, name: 'New', sku: 'NEW-1', active: true } });

    service.updateProduct(2, { name: 'Updated' }).subscribe((product) => {
      expect(product.name).toBe('Updated');
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/products/2'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { id: 2, name: 'Updated', sku: 'NEW-1', active: true } });

    service.deleteProduct(2).subscribe((value) => {
      expect(value).toBeUndefined();
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/products/2'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.getProducts().subscribe((page) => {
      expect(page.content[0].name).toBe('Default');
    });
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/products?page=0&size=50'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 3, name: 'Default', sku: 'DEF-1', active: true }] } });
  });

  it('SupplierService supports list search and actions', () => {
    const service = TestBed.inject(SupplierService);

    service.getSuppliers(1, 10, true).subscribe((page) => {
      expect(page.content[0].name).toBe('Acme');
    });
    let req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/suppliers?page=1&size=10&active=true'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 3, name: 'Acme', contactEmail: 'a@test.com', contactPhone: '1', city: 'Pune', country: 'India', category: 'GENERAL' }] } });

    service.searchSuppliers('  raw mats ', 0, 20, false).subscribe((page) => {
      expect(page.content.length).toBe(1);
    });
    req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/suppliers/search?q=raw%20mats&page=0&size=20&active=false'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 4, name: 'RawCo', contactEmail: 'r@test.com', contactPhone: '2', city: 'Mumbai', country: 'India', category: 'RAW_MATERIALS' }] } });

    service.getSupplierById(5).subscribe((supplier) => expect(supplier.id).toBe(5));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers/5'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 5, name: 'One', contactEmail: 'o@test.com', contactPhone: '3', city: 'Delhi', country: 'India', category: 'GENERAL' } });

    service.createSupplier({ name: 'Create', contactEmail: 'c@test.com', contactPhone: '4', city: 'Pune', country: 'India', category: 'GENERAL' }).subscribe((supplier) => {
      expect(supplier.name).toBe('Create');
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 6, name: 'Create', contactEmail: 'c@test.com', contactPhone: '4', city: 'Pune', country: 'India', category: 'GENERAL' } });

    service.updateSupplier(6, { name: 'Update', contactEmail: 'u@test.com', contactPhone: '4', city: 'Pune', country: 'India', category: 'GENERAL' } as any).subscribe((supplier) => {
      expect(supplier.name).toBe('Update');
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers/6'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { id: 6, name: 'Update', contactEmail: 'u@test.com', contactPhone: '4', city: 'Pune', country: 'India', category: 'GENERAL' } });

    service.deleteSupplier(6).subscribe((value) => expect(value).toBeUndefined());
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers/6'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.reactivateSupplier(6).subscribe((value) => expect(value).toBeUndefined());
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers/6/reactivate'));
    expect(req.request.method).toBe('PATCH');
    req.flush({});

    service.getDeactivationCheck(6).subscribe((check) => expect(check.canDeactivate).toBe(false));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/suppliers/6/deactivation-check'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { canDeactivate: false, blockingOrderCount: 1, blockingStatuses: ['APPROVED'], blockingOrderNumbers: ['PO-1'], blockingInvoiceCount: 0, blockingInvoiceStatuses: [], blockingInvoiceNumbers: [], message: 'blocked' } });

    service.getSuppliers().subscribe((page) => expect(page.content[0].name).toBe('Default Supplier'));
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/suppliers?page=0&size=20'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 7, name: 'Default Supplier', contactEmail: 'd@test.com', contactPhone: '9', city: 'Pune', country: 'India', category: 'GENERAL' }] } });

    service.searchSuppliers('branch').subscribe((page) => expect(page.content[0].name).toBe('BranchCo'));
    req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/suppliers/search?q=branch&page=0&size=20'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 8, name: 'BranchCo', contactEmail: 'b@test.com', contactPhone: '8', city: 'Delhi', country: 'India', category: 'GENERAL' }] } });
  });

  it('WarehouseService handles read write and reactivate requests', () => {
    const service = TestBed.inject(WarehouseService);

    service.getWarehouses(true).subscribe((warehouses) => expect(warehouses[0].name).toBe('Main'));
    let req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/warehouses?activeOnly=true'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ id: 1, name: 'Main', location: 'Plot', city: 'Pune', country: 'India', active: true }] });

    service.getWarehouseById(1).subscribe((warehouse) => expect(warehouse.id).toBe(1));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/warehouses/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 1, name: 'Main', location: 'Plot', city: 'Pune', country: 'India', active: true } });

    service.createWarehouse({ name: 'New', location: 'A', city: 'Pune', country: 'India' }).subscribe((warehouse) => expect(warehouse.name).toBe('New'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/warehouses'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 2, name: 'New', location: 'A', city: 'Pune', country: 'India', active: true } });

    service.updateWarehouse(2, { name: 'Updated', location: 'B', city: 'Pune', country: 'India' }).subscribe((warehouse) => expect(warehouse.name).toBe('Updated'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/warehouses/2'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { id: 2, name: 'Updated', location: 'B', city: 'Pune', country: 'India', active: true } });

    service.deactivateWarehouse(2).subscribe((value) => expect(value).toBeUndefined());
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/warehouses/2'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.reactivateWarehouse(2).subscribe((warehouse) => expect(warehouse.active).toBe(true));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/warehouses/2'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ active: true });
    req.flush({ data: { id: 2, name: 'Updated', location: 'B', city: 'Pune', country: 'India', active: true } });
  });

  it('Invoice Alert StockMovement and Report services map payloads correctly', () => {
    const invoiceService = TestBed.inject(InvoiceService);
    const alertService = TestBed.inject(AlertService);
    const stockMovementService = TestBed.inject(StockMovementService);
    const reportService = TestBed.inject(ReportService);

    invoiceService.searchInvoices('abc 123', 'PENDING', 1, 5).subscribe((page) => {
      expect(page.content[0].invoiceNumber).toBe('INV-1');
    });
    let req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/invoices?page=1&size=5&query=abc%20123&status=PENDING'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 1, invoiceNumber: 'INV-1', orderNumber: 'PO-1', purchaseOrderStatus: 'RECEIVED', supplierName: 'Acme', amount: 50, dueDate: '2026-01-01', status: 'PENDING', createdAt: '2026-01-01T00:00:00Z' }] } });

    invoiceService.getInvoiceById(1).subscribe((invoice) => expect(invoice.invoiceNumber).toBe('INV-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/invoices/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 1, invoiceNumber: 'INV-1', orderNumber: 'PO-1', purchaseOrderStatus: 'RECEIVED', supplierName: 'Acme', amount: 50, dueDate: '2026-01-01', status: 'PENDING', createdAt: '2026-01-01T00:00:00Z' } });

    invoiceService.getInvoiceByPurchaseOrderId(2).subscribe((invoice) => expect(invoice.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/invoices/purchase-order/2'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 2, invoiceNumber: 'INV-2', orderNumber: 'PO-2', purchaseOrderStatus: 'APPROVED', supplierName: 'Beta', amount: 75, dueDate: '2026-01-02', status: 'PAID', createdAt: '2026-01-01T00:00:00Z' } });

    alertService.getAlerts().subscribe((alerts) => expect(alerts[0].type).toBe('WARN'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/alerts'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ id: 1, type: 'WARN', message: 'Low stock', read: false, createdAt: '2026-01-01T00:00:00Z' }] });

    alertService.markAsRead(1).subscribe((value) => expect(value).toBeNull());
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/alerts/1/read'));
    expect(req.request.method).toBe('POST');
    req.flush(null);

    alertService.clearAll().subscribe((value) => expect(value).toBeNull());
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/alerts'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    stockMovementService.getAll(3, 15).subscribe((page) => expect(page.content[0].id).toBe(10));
    req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/stock-movements?page=3&size=15'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 10 }] } });

    reportService.getDashboardStats().subscribe((stats) => expect(stats.totalWarehouses).toBe(4));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/reports/dashboard'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { totalWarehouses: 4, activeSuppliers: 7, shipments: 10, openOrders: 3, totalValue: 9999 } });

    reportService.downloadStockMovementSummaryPdf().subscribe((blob) => expect(blob).toBeInstanceOf(Blob));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/reports/stock-movement-summary/pdf'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf']));

    reportService.downloadSupplierPerformanceExcel().subscribe((blob) => expect(blob).toBeInstanceOf(Blob));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/reports/supplier-performance/excel'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['excel']));

    reportService.downloadFinancialReconciliationCsv().subscribe((blob) => expect(blob).toBeInstanceOf(Blob));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/reports/financial-reconciliation/csv'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['csv']));

    invoiceService.searchInvoices(undefined, undefined).subscribe((page) => expect(page.content[0].invoiceNumber).toBe('INV-2'));
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/invoices?page=0&size=20'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ id: 2, invoiceNumber: 'INV-2', orderNumber: 'PO-2', purchaseOrderStatus: 'PARTIALLY_RECEIVED', supplierName: 'Beta', amount: 75, dueDate: '2026-01-02', status: 'PAID', createdAt: '2026-01-01T00:00:00Z' }] } });
  });
});
