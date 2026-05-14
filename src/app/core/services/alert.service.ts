import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';

export interface Alert {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private apiUrl = getApiUrl('alerts');

  constructor(private http: HttpClient) {}

  getAlerts(): Observable<Alert[]> {
    return this.http.get<ApiResponse<Alert[]>>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {});
  }

  clearAll(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
