import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Page } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  orderNumber: string;
  purchaseOrderStatus: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: string;
  notes?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = getApiUrl('invoices');

  constructor(private http: HttpClient) {}

  searchInvoices(query?: string, status?: string, page: number = 0, size: number = 20): Observable<Page<Invoice>> {
    let url = `${this.apiUrl}?page=${page}&size=${size}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (status) url += `&status=${status}`;

    return this.http.get<ApiResponse<Page<Invoice>>>(url).pipe(
      map(res => res.data)
    );
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<ApiResponse<Invoice>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  getInvoiceByPurchaseOrderId(purchaseOrderId: number): Observable<Invoice> {
    return this.http.get<ApiResponse<Invoice>>(`${this.apiUrl}/purchase-order/${purchaseOrderId}`).pipe(
      map(res => res.data)
    );
  }
}
