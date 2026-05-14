import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

export interface StockLevel {
  id: number;
  warehouseId: number;
  warehouseName: string;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  reorderPoint: number;
  maxCapacity?: number;
  lowStock: boolean;
  overstock: boolean;
  updatedAt: string;
}

export interface StockQueryOptions {
  query?: string;
  lowStockOnly?: boolean;
  overstockOnly?: boolean;
  warehouseId?: number;
  sortBy?: 'productName' | 'sku' | 'quantity' | 'availableQty' | 'reservedQty' | 'reorderPoint' | 'maxCapacity' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
}

export interface TransferStockPayload {
  productId: number;
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  quantity: number;
  referenceId?: string;
}

export type AdjustmentReason =
  | 'CYCLE_COUNT'
  | 'DAMAGED_GOODS'
  | 'EXPIRED'
  | 'THEFT'
  | 'FOUND_STOCK'
  | 'SUPPLIER_RETURN'
  | 'QUALITY_REJECTION'
  | 'DATA_CORRECTION'
  | 'OTHER';

export interface InitializeStockPayload {
  warehouseId: number;
  productId: number;
  initialQty?: number;
  reorderPoint?: number;
  maxCapacity?: number | null;
}

export interface AdjustStockPayload {
  productId: number;
  quantityDelta: number;
  reason: AdjustmentReason;
  notes?: string;
  reorderPoint?: number | null;
  maxCapacity?: number | null;
}

export interface BulkThresholdUpdatePayload {
  productIds: number[];
  reorderPoint?: number | null;
  maxCapacity?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = getApiUrl('stock');
  private mutationContext = new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true);

  constructor(private http: HttpClient) {}

  getStockByWarehouse(warehouseId: number, options?: StockQueryOptions): Observable<StockLevel[]> {
    const params = this.buildQueryParams(options);
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.apiUrl}/warehouses/${warehouseId}${params}`).pipe(
      map(res => res.data)
    );
  }

  getLowStock(options?: StockQueryOptions): Observable<StockLevel[]> {
    const params = this.buildQueryParams(options);
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.apiUrl}/low-stock${params}`).pipe(
      map(res => res.data)
    );
  }

  initializeStock(payload: InitializeStockPayload): Observable<StockLevel> {
    const params = new URLSearchParams();
    params.set('initialQty', String(payload.initialQty ?? 0));
    params.set('reorderPoint', String(payload.reorderPoint ?? 0));
    if (payload.maxCapacity !== null && payload.maxCapacity !== undefined) {
      params.set('maxCapacity', String(payload.maxCapacity));
    }

    return this.http.post<ApiResponse<StockLevel>>(
      `${this.apiUrl}/warehouses/${payload.warehouseId}/products/${payload.productId}/initialize?${params.toString()}`,
      {},
      { context: this.mutationContext }
    ).pipe(
      map(res => res.data)
    );
  }

  adjustStock(warehouseId: number, payload: AdjustStockPayload): Observable<StockLevel> {
    return this.http.patch<ApiResponse<StockLevel>>(`${this.apiUrl}/warehouses/${warehouseId}/adjust`, payload, {
      context: this.mutationContext
    }).pipe(
      map(res => res.data)
    );
  }

  updateBulkThresholds(warehouseId: number, payload: BulkThresholdUpdatePayload): Observable<StockLevel[]> {
    return this.http.patch<ApiResponse<StockLevel[]>>(`${this.apiUrl}/warehouses/${warehouseId}/thresholds`, payload, {
      context: this.mutationContext
    }).pipe(
      map(res => res.data)
    );
  }

  transferStock(payload: TransferStockPayload): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/transfer`, payload, {
      context: this.mutationContext
    }).pipe(
      map(() => undefined)
    );
  }

  private buildQueryParams(options?: StockQueryOptions): string {
    const params = new URLSearchParams();
    if (options?.query?.trim()) {
      params.set('q', options.query.trim());
    }
    if (options?.lowStockOnly) {
      params.set('lowStockOnly', 'true');
    }
    if (options?.overstockOnly) {
      params.set('overstockOnly', 'true');
    }
    if (options?.warehouseId !== undefined) {
      params.set('warehouseId', String(options.warehouseId));
    }
    if (options?.sortBy) {
      params.set('sortBy', options.sortBy);
    }
    if (options?.sortDir) {
      params.set('sortDir', options.sortDir);
    }

    const query = params.toString();
    return query ? `?${query}` : '';
  }
}
