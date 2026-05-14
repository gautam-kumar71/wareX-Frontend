import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Page } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  price?: number;
  costPrice?: number;
  taxRate?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit?: string;
  dimensionUnit?: string;
  unit?: string;
  totalStock?: number;
  allocatedStock?: number;
  reorderLevel?: number;
  maxStockLevel?: number;
  active: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = getApiUrl('products');

  constructor(private http: HttpClient) {}

  getProducts(page: number = 0, size: number = 50, query?: string, activeOnly: boolean = false): Observable<Page<Product>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (query?.trim()) {
      params.set('q', query.trim());
    }
    if (activeOnly) {
      params.set('activeOnly', 'true');
    }

    return this.http.get<ApiResponse<Page<Product>>>(`${this.apiUrl}?${params.toString()}`).pipe(
      map(res => res.data)
    );
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, product).pipe(
      map(res => res.data)
    );
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product).pipe(
      map(res => res.data)
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
