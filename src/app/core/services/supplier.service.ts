import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { ApiResponse, Page } from '../models/api-response.model';

export interface Supplier {
  id?: number;
  name: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  city: string;
  country: string;
  gstin?: string;
  paymentTerms?: number;
  creditLimit?: number;
  notes?: string;
  category: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierOption {
  value: string;
  label: string;
}

export interface SupplierDeactivationCheck {
  canDeactivate: boolean;
  blockingOrderCount: number;
  blockingStatuses: string[];
  blockingOrderNumbers: string[];
  blockingInvoiceCount: number;
  blockingInvoiceStatuses: string[];
  blockingInvoiceNumbers: string[];
  message?: string;
}

export const SUPPLIER_CATEGORY_OPTIONS: SupplierOption[] = [
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'RAW_MATERIALS', label: 'Raw Materials' },
  { value: 'CHEMICALS', label: 'Chemicals' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'GENERAL', label: 'General' }
];

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private apiUrl = getApiUrl('suppliers');

  constructor(private http: HttpClient) {}

  getSuppliers(page: number = 0, size: number = 20, active?: boolean): Observable<Page<Supplier>> {
    const activeFilter = active !== undefined ? `&active=${active}` : '';

    return this.http.get<ApiResponse<Page<Supplier>>>(`${this.apiUrl}?page=${page}&size=${size}${activeFilter}`).pipe(
      map(res => res.data)
    );
  }

  searchSuppliers(query: string, page: number = 0, size: number = 20, active?: boolean): Observable<Page<Supplier>> {
    const trimmedQuery = query.trim();
    const activeFilter = active !== undefined ? `&active=${active}` : '';

    return this.http.get<ApiResponse<Page<Supplier>>>(
      `${this.apiUrl}/search?q=${encodeURIComponent(trimmedQuery)}&page=${page}&size=${size}${activeFilter}`
    ).pipe(
      map(res => res.data)
    );
  }

  getSupplierById(id: number): Observable<Supplier> {
    return this.http.get<ApiResponse<Supplier>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  createSupplier(supplier: Supplier): Observable<Supplier> {
    return this.http.post<ApiResponse<Supplier>>(this.apiUrl, supplier).pipe(
      map(res => res.data)
    );
  }

  updateSupplier(id: number, supplier: Supplier): Observable<Supplier> {
    return this.http.put<ApiResponse<Supplier>>(`${this.apiUrl}/${id}`, supplier).pipe(
      map(res => res.data)
    );
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  reactivateSupplier(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/${id}/reactivate`, {}).pipe(
      map(() => undefined)
    );
  }

  getDeactivationCheck(id: number): Observable<SupplierDeactivationCheck> {
    return this.http.get<ApiResponse<SupplierDeactivationCheck>>(`${this.apiUrl}/${id}/deactivation-check`).pipe(
      map(res => res.data)
    );
  }
}
