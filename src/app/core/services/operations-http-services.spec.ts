import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { OrderService } from './order.service';
import { StockService } from './stock.service';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

describe('Operations HTTP services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PaymentService,
        OrderService,
        StockService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('PaymentService uses silent error context for mutations and maps reads', () => {
    const service = TestBed.inject(PaymentService);

    service.getPayments(1, 25).subscribe((page) => expect(page.content[0].transactionId).toBe('TXN-1'));
    let req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/payments?page=1&size=25'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ transactionId: 'TXN-1' }] } });

    service.getPaymentByTransactionId('TXN-1').subscribe((payment) => expect(payment.transactionId).toBe('TXN-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/payments/TXN-1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { transactionId: 'TXN-1' } });

    service.processPayment({ invoiceNumber: 'INV-1', amount: 10, paymentMethod: 'CARD' }).subscribe((payment) => expect(payment.invoiceNumber).toBe('INV-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/payments'));
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { invoiceNumber: 'INV-1' } });

    service.createRazorpayOrder({ invoiceNumber: 'INV-1', amount: 10, paymentMethod: 'RAZORPAY' }).subscribe((order) => expect(order.razorpayOrderId).toBe('order-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/payments/razorpay/order'));
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { razorpayOrderId: 'order-1', amount: 10, currency: 'INR' } });

    service.verifyRazorpayPayment({ razorpayPaymentId: 'pay-1', razorpayOrderId: 'order-1', razorpaySignature: 'sig', invoiceNumber: 'INV-1', amount: 10 }).subscribe((payment) => expect(payment.invoiceNumber).toBe('INV-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/payments/razorpay/verify'));
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { invoiceNumber: 'INV-1' } });

    service.cancelPayment('TXN-1', 'Duplicate payment').subscribe((payment) => expect(payment.transactionId).toBe('TXN-1'));
    req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/payments/TXN-1/cancel?reason=Duplicate%20payment'));
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { transactionId: 'TXN-1' } });

    service.getPayments().subscribe((page) => expect(page.content[0].transactionId).toBe('TXN-2'));
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/payments?page=0&size=50'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ transactionId: 'TXN-2' }] } });
  });

  it('OrderService builds status warehouse and mutation requests correctly', () => {
    const service = TestBed.inject(OrderService);

    service.getOrders('APPROVED', 2, 30, 7).subscribe((page) => expect(page.content[0].orderNumber).toBe('PO-1'));
    let req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/purchase-orders?page=2&size=30&status=APPROVED&warehouseId=7'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ orderNumber: 'PO-1', lines: [], createdAt: '2026-01-01T00:00:00Z' }] } });

    service.getOrderById(1).subscribe((order) => expect(order.orderNumber).toBe('PO-1'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/purchase-orders/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { orderNumber: 'PO-1', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.createOrder({ supplierId: 1 }).subscribe((order) => expect(order.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/purchase-orders'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { orderNumber: 'PO-2', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.submitOrder(2).subscribe((order) => expect(order.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/purchase-orders/2/submit'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { orderNumber: 'PO-2', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.approveOrder(2).subscribe((order) => expect(order.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/purchase-orders/2/approve'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { orderNumber: 'PO-2', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.receiveStock(2, 100, 3).subscribe((order) => expect(order.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/purchase-orders/2/receive'));
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    expect(req.request.body).toEqual({ productId: 100, receivedQty: 3 });
    req.flush({ data: { orderNumber: 'PO-2', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.cancelOrder(2, 'Need review & retry').subscribe((order) => expect(order.orderNumber).toBe('PO-2'));
    req = httpMock.expectOne((r) => r.urlWithParams.includes('/api/v1/purchase-orders/2/cancel?reason=Need%20review%20%26%20retry'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { orderNumber: 'PO-2', lines: [], createdAt: '2026-01-01T00:00:00Z' } });

    service.getOrders().subscribe((page) => expect(page.content[0].orderNumber).toBe('PO-3'));
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/purchase-orders?page=0&size=20'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: { content: [{ orderNumber: 'PO-3', lines: [], createdAt: '2026-01-01T00:00:00Z' }] } });
  });

  it('StockService builds query strings and uses silent context for mutations', () => {
    const service = TestBed.inject(StockService);

    service.getStockByWarehouse(1, {
      query: '  sku-1  ',
      lowStockOnly: true,
      overstockOnly: true,
      sortBy: 'availableQty',
      sortDir: 'asc'
    }).subscribe((items) => expect(items[0].productId).toBe(100));
    let req = httpMock.expectOne((r) =>
      r.urlWithParams.includes('/api/v1/stock/warehouses/1?q=sku-1&lowStockOnly=true&overstockOnly=true&sortBy=availableQty&sortDir=asc')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ productId: 100 }] });

    service.getLowStock({ warehouseId: 2, query: ' low ', sortBy: 'quantity', sortDir: 'desc' }).subscribe((items) => {
      expect(items[0].warehouseId).toBe(2);
    });
    req = httpMock.expectOne((r) =>
      r.urlWithParams.includes('/api/v1/stock/low-stock?q=low&warehouseId=2&sortBy=quantity&sortDir=desc')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ warehouseId: 2 }] });

    service.initializeStock({ warehouseId: 1, productId: 100, initialQty: 10, reorderPoint: 5, maxCapacity: 30 }).subscribe((item) => {
      expect(item.productId).toBe(100);
    });
    req = httpMock.expectOne((r) =>
      r.urlWithParams.includes('/api/v1/stock/warehouses/1/products/100/initialize?initialQty=10&reorderPoint=5&maxCapacity=30')
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { productId: 100 } });

    service.adjustStock(1, { productId: 100, quantityDelta: 2, reason: 'FOUND_STOCK' }).subscribe((item) => {
      expect(item.productId).toBe(100);
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/stock/warehouses/1/adjust'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: { productId: 100 } });

    service.updateBulkThresholds(1, { productIds: [100], reorderPoint: 8 }).subscribe((items) => {
      expect(items[0].productId).toBe(100);
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/stock/warehouses/1/thresholds'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({ data: [{ productId: 100 }] });

    service.transferStock({ productId: 100, sourceWarehouseId: 1, destinationWarehouseId: 2, quantity: 4 }).subscribe((value) => {
      expect(value).toBeUndefined();
    });
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/stock/transfer'));
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SKIP_GLOBAL_ERROR_TOAST)).toBe(true);
    req.flush({});

    service.getStockByWarehouse(2).subscribe((items) => expect(items[0].warehouseId).toBe(2));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/stock/warehouses/2'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ warehouseId: 2 }] });

    service.getLowStock().subscribe((items) => expect(items[0].productId).toBe(200));
    req = httpMock.expectOne((r) => r.url.endsWith('/api/v1/stock/low-stock'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [{ productId: 200 }] });

    service.initializeStock({ warehouseId: 3, productId: 300, maxCapacity: null }).subscribe((item) => {
      expect(item.productId).toBe(300);
    });
    req = httpMock.expectOne((r) => r.urlWithParams.endsWith('/api/v1/stock/warehouses/3/products/300/initialize?initialQty=0&reorderPoint=0'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { productId: 300 } });
  });
});
