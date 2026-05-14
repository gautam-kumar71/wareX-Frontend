import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';

export interface Warehouse {
  id?: number;
  name: string;
  location: string;
  city: string;
  country: string;
  totalStorageCapacity?: number;
  currentCapacityUtilization?: number;
  capacityPercent?: number;
  lowStockItemCount?: number;
  overstockItemCount?: number;
  managerName?: string;
  contactPhone?: string;
  suggestedTransferWarehouseId?: number;
  suggestedTransferWarehouseName?: string;
  suggestedTransferFreeCapacity?: number;
  capacityAdvisory?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = getApiUrl('warehouses');

  constructor(private http: HttpClient) {}

  getWarehouses(activeOnly: boolean = false): Observable<Warehouse[]> {
    return this.http.get<ApiResponse<Warehouse[]>>(`${this.apiUrl}?activeOnly=${activeOnly}`).pipe(
      map(res => res.data)
    );
  }

  getWarehouseById(id: number): Observable<Warehouse> {
    return this.http.get<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  createWarehouse(warehouse: Warehouse): Observable<Warehouse> {
    return this.http.post<ApiResponse<Warehouse>>(this.apiUrl, warehouse).pipe(
      map(res => res.data)
    );
  }

  updateWarehouse(id: number, warehouse: Warehouse): Observable<Warehouse> {
    return this.http.put<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}`, warehouse).pipe(
      map(res => res.data)
    );
  }

  deactivateWarehouse(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  reactivateWarehouse(id: number): Observable<Warehouse> {
    return this.http.put<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}`, { active: true }).pipe(
      map(res => res.data)
    );
  }
}
