import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';

export interface DashboardStats {
  totalWarehouses: number;
  activeSuppliers: number;
  shipments: number;
  openOrders: number;
  totalValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = getApiUrl('reports');

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard`).pipe(
      map(res => res.data)
    );
  }

  downloadStockMovementSummaryPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/stock-movement-summary/pdf`, {
      responseType: 'blob'
    });
  }

  downloadSupplierPerformanceExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/supplier-performance/excel`, {
      responseType: 'blob'
    });
  }

  downloadFinancialReconciliationCsv(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/financial-reconciliation/csv`, {
      responseType: 'blob'
    });
  }
}
