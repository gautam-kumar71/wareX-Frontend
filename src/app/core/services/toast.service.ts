import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
    const toast: Toast = { message, type, duration };
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    setTimeout(() => {
      this.remove(toast);
    }, duration);
  }

  success(message: string, duration: number = 5000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 5000) {
    this.show(message, 'warning', duration);
  }

  remove(toast: Toast) {
    const currentToasts = this.toastsSubject.value.filter(t => t !== toast);
    this.toastsSubject.next(currentToasts);
  }
}
