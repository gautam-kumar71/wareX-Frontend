import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unavailable-container">
      <div class="icon">🛰️</div>
      <h3>{{ serviceName }} Offline</h3>
      <p>This module depends on a microservice that is currently unreachable. The rest of the system is still functional.</p>
      <button class="retry-btn" (click)="retry.emit()">
        Try Again
      </button>
    </div>
  `,
  styles: [`
    .unavailable-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      background: rgba(23, 23, 23, 0.5);
      border: 1px dashed #333;
      border-radius: 12px;
      margin: 2rem 0;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1.5rem;
      opacity: 0.5;
    }
    h3 {
      font-size: 1.25rem;
      color: #fca5a5;
      margin-bottom: 0.75rem;
    }
    p {
      color: #a3a3a3;
      max-width: 400px;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .retry-btn {
      background: #262626;
      color: white;
      border: 1px solid #444;
      padding: 0.625rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .retry-btn:hover {
      background: #333;
      border-color: #555;
    }
  `]
})
export class ServiceUnavailableComponent {
  @Input() serviceName: string = 'Service';
  @Output() retry = new EventEmitter<void>();
}
