import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { StockMovement, PaginatedResponse } from '../models/stock-movement.model';

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private apiUrl = getApiUrl('stockMovements');

  constructor(private http: HttpClient) {}

  getAll(page: number = 0, size: number = 50): Observable<PaginatedResponse<StockMovement>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<ApiResponse<PaginatedResponse<StockMovement>>>(this.apiUrl, { params }).pipe(
      map(res => res.data)
    );
  }
}
