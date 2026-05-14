import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Page } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

export interface PurchaseOrderLine {
  productId: number;
  productName: string;
  productSku: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  warehouseId: number;
  totalAmount: number;
  status: string;
  notes?: string;
  expectedDate?: string;
  cancelReason?: string;
  updatedAt?: string;
  lines: PurchaseOrderLine[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = getApiUrl('purchaseOrders');
  private mutationContext = new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true);

  constructor(private http: HttpClient) {}

  getOrders(status?: string, page: number = 0, size: number = 20, warehouseId?: number): Observable<Page<PurchaseOrder>> {
    let url = `${this.apiUrl}?page=${page}&size=${size}`;
    if (status) {
      url += `&status=${status}`;
    }
    if (warehouseId !== undefined) {
      url += `&warehouseId=${warehouseId}`;
    }
    
    return this.http.get<ApiResponse<Page<PurchaseOrder>>>(url).pipe(
      map(res => res.data)
    );
  }

  getOrderById(id: number): Observable<PurchaseOrder> {
    return this.http.get<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  createOrder(orderData: any): Observable<PurchaseOrder> {
    return this.http.post<ApiResponse<PurchaseOrder>>(this.apiUrl, orderData).pipe(
      map(res => res.data)
    );
  }

  submitOrder(id: number): Observable<PurchaseOrder> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/submit`, {}).pipe(
      map(res => res.data)
    );
  }

  approveOrder(id: number): Observable<PurchaseOrder> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/approve`, {}).pipe(
      map(res => res.data)
    );
  }

  receiveStock(id: number, productId: number, receivedQty: number): Observable<PurchaseOrder> {
    return this.http.post<ApiResponse<PurchaseOrder>>(
      `${this.apiUrl}/${id}/receive`,
      { productId, receivedQty },
      { context: this.mutationContext }
    ).pipe(
      map(res => res.data)
    );
  }

  cancelOrder(id: number, reason: string): Observable<PurchaseOrder> {
    return this.http.post<ApiResponse<PurchaseOrder>>(`${this.apiUrl}/${id}/cancel?reason=${encodeURIComponent(reason)}`, {}).pipe(
      map(res => res.data)
    );
  }
}
