import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertService } from './alert.service';
import { ReportService } from './report.service';
import { SupplierService } from './supplier.service';
import { WarehouseService } from './warehouse.service';

describe('Admin and support HTTP services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AlertService,
        ReportService,
        SupplierService,
        WarehouseService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('AlertService loads marks and clears alerts', () => {
    const service = TestBed.inject(AlertService);

    service.getAlerts().subscribe((alerts) => expect(alerts[0].id).toBe(1));
    let req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/alerts'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ id: 1, type: 'LOW_STOCK', message: 'Check stock', read: false, createdAt: '2026-05-03T00:00:00Z' }] });

    service.markAsRead(1).subscribe();
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/alerts/1/read'));
    expect(req.request.method).toBe('POST');
    req.flush({});

    service.clearAll().subscribe();
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/alerts'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('ReportService maps dashboard stats and downloads files as blobs', () => {
    const service = TestBed.inject(ReportService);
    const pdfBlob = new Blob(['pdf']);
    const xlsBlob = new Blob(['excel']);
    const csvBlob = new Blob(['csv']);

    service.getDashboardStats().subscribe((stats) => expect(stats.totalValue).toBe(9000));
    let req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/reports/dashboard'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { totalWarehouses: 3, activeSuppliers: 5, shipments: 8, openOrders: 2, totalValue: 9000 } });

    service.downloadStockMovementSummaryPdf().subscribe((blob) => expect(blob).toEqual(pdfBlob));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/reports/stock-movement-summary/pdf'));
    expect(req.request.responseType).toBe('blob');
    req.flush(pdfBlob);

    service.downloadSupplierPerformanceExcel().subscribe((blob) => expect(blob).toEqual(xlsBlob));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/reports/supplier-performance/excel'));
    expect(req.request.responseType).toBe('blob');
    req.flush(xlsBlob);

    service.downloadFinancialReconciliationCsv().subscribe((blob) => expect(blob).toEqual(csvBlob));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/reports/financial-reconciliation/csv'));
    expect(req.request.responseType).toBe('blob');
    req.flush(csvBlob);
  });

  it('SupplierService builds CRUD, search, and dependency-check requests', () => {
    const service = TestBed.inject(SupplierService);

    service.getSuppliers(1, 10, true).subscribe((page) => expect(page.content[0].name).toBe('Northwind'));
    let req = httpMock.expectOne((request) => request.urlWithParams.includes('/api/v1/suppliers?page=1&size=10&active=true'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ name: 'Northwind', contactEmail: 'a@b.com', contactPhone: '1', city: 'Pune', country: 'India', category: 'GENERAL' }], totalPages: 2, number: 1, totalElements: 11 } });

    service.searchSuppliers('  north wind  ', 0, 20, false).subscribe((page) => expect(page.totalElements).toBe(1));
    req = httpMock.expectOne((request) => request.urlWithParams.includes('/api/v1/suppliers/search?q=north%20wind&page=0&size=20&active=false'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [], totalPages: 1, number: 0, totalElements: 1 } });

    service.getSupplierById(5).subscribe((supplier) => expect(supplier.id).toBe(5));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers/5'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 5, name: 'Northwind', contactEmail: 'a@b.com', contactPhone: '1', city: 'Pune', country: 'India', category: 'GENERAL' } });

    service.createSupplier({ name: 'Create', contactEmail: 'create@x.com', contactPhone: '1', city: 'Pune', country: 'India', category: 'GENERAL' }).subscribe((supplier) => {
      expect(supplier.name).toBe('Create');
    });
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { name: 'Create', contactEmail: 'create@x.com', contactPhone: '1', city: 'Pune', country: 'India', category: 'GENERAL' } });

    service.updateSupplier(5, { name: 'Update', contactEmail: 'update@x.com', contactPhone: '2', city: 'Delhi', country: 'India', category: 'HARDWARE' }).subscribe((supplier) => {
      expect(supplier.name).toBe('Update');
    });
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers/5'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { name: 'Update', contactEmail: 'update@x.com', contactPhone: '2', city: 'Delhi', country: 'India', category: 'HARDWARE' } });

    service.deleteSupplier(5).subscribe((result) => expect(result).toBeUndefined());
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers/5'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.reactivateSupplier(5).subscribe((result) => expect(result).toBeUndefined());
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers/5/reactivate'));
    expect(req.request.method).toBe('PATCH');
    req.flush({});

    service.getDeactivationCheck(5).subscribe((check) => expect(check.blockingOrderCount).toBe(2));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/suppliers/5/deactivation-check'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { canDeactivate: false, blockingOrderCount: 2, blockingStatuses: ['APPROVED'], blockingOrderNumbers: ['PO-1'], blockingInvoiceCount: 1, blockingInvoiceStatuses: ['PENDING'], blockingInvoiceNumbers: ['INV-1'] } });
  });

  it('WarehouseService maps warehouse CRUD flows', () => {
    const service = TestBed.inject(WarehouseService);

    service.getWarehouses(true).subscribe((warehouses) => expect(warehouses[0].name).toBe('Central'));
    let req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses?activeOnly=true'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ name: 'Central', location: 'Dock', city: 'Pune', country: 'India', active: true }] });

    service.getWarehouseById(3).subscribe((warehouse) => expect(warehouse.id).toBe(3));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses/3'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { id: 3, name: 'Central', location: 'Dock', city: 'Pune', country: 'India' } });

    service.createWarehouse({ name: 'New', location: 'A', city: 'Pune', country: 'India' }).subscribe((warehouse) => expect(warehouse.name).toBe('New'));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { name: 'New', location: 'A', city: 'Pune', country: 'India' } });

    service.updateWarehouse(3, { name: 'Updated', location: 'B', city: 'Delhi', country: 'India' }).subscribe((warehouse) => expect(warehouse.name).toBe('Updated'));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses/3'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { name: 'Updated', location: 'B', city: 'Delhi', country: 'India' } });

    service.deactivateWarehouse(3).subscribe((result) => expect(result).toBeUndefined());
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses/3'));
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.reactivateWarehouse(3).subscribe((warehouse) => expect(warehouse.active).toBe(true));
    req = httpMock.expectOne((request) => request.url.endsWith('/api/v1/warehouses/3'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ active: true });
    req.flush({ data: { name: 'Central', location: 'Dock', city: 'Pune', country: 'India', active: true } });
  });
});
