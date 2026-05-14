import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastService.toasts$ | async" 
           class="toast" 
           [ngClass]="toast.type"
           (click)="toastService.remove(toast)">
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✅</span>
          <span *ngIf="toast.type === 'error'">❌</span>
          <span *ngIf="toast.type === 'warning'">⚠️</span>
          <span *ngIf="toast.type === 'info'">ℹ️</span>
        </div>
        <div class="toast-content">
          {{ toast.message }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 2rem;
      right: 2rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      background: #1e1e1e;
      color: white;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      min-width: 300px;
      max-width: 450px;
      border-left: 4px solid #3b82f6;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast.success { border-left-color: #10b981; }
    .toast.error { border-left-color: #ef4444; }
    .toast.warning { border-left-color: #f59e0b; }
    .toast.info { border-left-color: #3b82f6; }
    
    .toast-icon { font-size: 1.25rem; }
    .toast-content { font-size: 0.875rem; font-weight: 500; }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
