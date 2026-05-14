import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Page } from '../models/api-response.model';
import { getApiUrl } from '../config/api.config';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

export interface Payment {
  id?: number;
  transactionId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  status: string;
  processedBy?: string;
  referenceNotes?: string;
  createdAt?: string;
}

export interface PaymentRequest {
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  referenceNotes?: string;
}

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export interface RazorpayVerifyRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  invoiceNumber: string;
  amount: number;
  referenceNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = getApiUrl('payments');
  private readonly silentErrorContext = new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true);

  constructor(private http: HttpClient) {}

  getPayments(page: number = 0, size: number = 50): Observable<Page<Payment>> {
    return this.http.get<ApiResponse<Page<Payment>>>(`${this.apiUrl}?page=${page}&size=${size}`).pipe(
      map(res => res.data)
    );
  }

  getPaymentByTransactionId(transactionId: string): Observable<Payment> {
    return this.http.get<ApiResponse<Payment>>(`${this.apiUrl}/${transactionId}`).pipe(
      map(res => res.data)
    );
  }

  processPayment(request: PaymentRequest): Observable<Payment> {
    return this.http.post<ApiResponse<Payment>>(this.apiUrl, request, {
      context: this.silentErrorContext
    }).pipe(
      map(res => res.data)
    );
  }

  createRazorpayOrder(request: PaymentRequest): Observable<RazorpayOrderResponse> {
    return this.http.post<ApiResponse<RazorpayOrderResponse>>(`${this.apiUrl}/razorpay/order`, request, {
      context: this.silentErrorContext
    }).pipe(
      map(res => res.data)
    );
  }

  verifyRazorpayPayment(request: RazorpayVerifyRequest): Observable<Payment> {
    return this.http.post<ApiResponse<Payment>>(`${this.apiUrl}/razorpay/verify`, request, {
      context: this.silentErrorContext
    }).pipe(
      map(res => res.data)
    );
  }

  cancelPayment(transactionId: string, reason: string): Observable<Payment> {
    return this.http.post<ApiResponse<Payment>>(
      `${this.apiUrl}/${transactionId}/cancel?reason=${encodeURIComponent(reason)}`,
      {},
      { context: this.silentErrorContext }
    ).pipe(
      map(res => res.data)
    );
  }
}
