import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiDocsService, ServiceDocLink } from '../../core/services/api-docs.service';

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="docs-shell">
      <header class="docs-hero card">
        <div>
          <p class="eyebrow">Platform Docs</p>
          <h1>Swagger endpoints in one place</h1>
          <p class="lede">Each microservice keeps one Swagger entry and one health check so the docs screen stays useful without the duplicate links.</p>
          <div class="gateway-links" *ngIf="gatewaySwaggerUrl">
            <a [href]="gatewaySwaggerUrl" target="_blank" rel="noopener noreferrer">Open aggregated Swagger</a>
          </div>
        </div>
        <div class="stats">
          <span class="stat-chip">{{ services.length }} services</span>
          <span class="stat-chip">Gateway aware</span>
        </div>
      </header>

      <div class="state card" *ngIf="loading">Loading documentation catalog...</div>
      <div class="state card error-state" *ngIf="!loading && errorMessage">{{ errorMessage }}</div>

      <div class="docs-grid" *ngIf="!loading && !errorMessage">
        <article class="doc-card card" *ngFor="let service of services">
          <div class="doc-head">
            <div>
              <p class="service-id">{{ service.serviceId }}</p>
              <h2>{{ service.displayName }}</h2>
            </div>
            <span class="gateway-badge" [class.gateway-badge--active]="service.gateway">
              {{ service.gateway ? 'Gateway' : 'Service' }}
            </span>
          </div>

          <p class="description">{{ service.description }}</p>

          <div class="link-stack">
            <a [href]="service.gatewayOpenApiUrl" target="_blank" rel="noopener noreferrer">OpenAPI JSON</a>
            <a *ngIf="service.healthUrl" [href]="service.healthUrl" target="_blank" rel="noopener noreferrer">Health</a>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .docs-shell { display: grid; gap: 1.25rem; }
    .docs-hero { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 1.5rem; }
    .eyebrow { margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem; color: var(--primary-soft); }
    h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.5rem); }
    .lede { margin: 0.75rem 0 0; max-width: 60ch; color: var(--text-muted); }
    .gateway-links { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
    .gateway-links a { color: white; text-decoration: none; padding: 0.75rem 0.95rem; border-radius: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); }
    .gateway-links a:hover { background: rgba(74, 124, 68, 0.14); border-color: rgba(74, 124, 68, 0.35); }
    .stats { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .stat-chip, .gateway-badge { display: inline-flex; align-items: center; justify-content: center; padding: 0.45rem 0.8rem; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); color: var(--text-muted); font-size: 0.8rem; font-weight: 700; }
    .gateway-badge--active { color: white; background: rgba(74, 124, 68, 0.18); border-color: rgba(74, 124, 68, 0.35); }
    .state { padding: 1rem 1.25rem; color: var(--text-muted); }
    .error-state { color: #fca5a5; }
    .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
    .doc-card { padding: 1.25rem; display: grid; gap: 1rem; }
    .doc-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .service-id { margin: 0 0 0.35rem; color: var(--text-muted); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h2 { margin: 0; font-size: 1.1rem; }
    .description { margin: 0; color: var(--text-muted); min-height: 3rem; }
    .link-stack { display: grid; gap: 0.55rem; }
    .link-stack a { color: white; text-decoration: none; padding: 0.8rem 0.9rem; border-radius: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.02); transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
    .link-stack a:hover { background: rgba(74, 124, 68, 0.14); border-color: rgba(74, 124, 68, 0.35); transform: translateY(-1px); }
    @media (max-width: 768px) {
      .docs-hero { flex-direction: column; }
    }
  `]
})
export class ApiDocsComponent implements OnInit {
  services: ServiceDocLink[] = [];
  loading = true;
  errorMessage = '';
  gatewaySwaggerUrl = '';

  constructor(private readonly apiDocsService: ApiDocsService) {}

  ngOnInit(): void {
    this.apiDocsService.getServiceDocs().subscribe({
      next: docs => {
        this.services = docs.services;
        this.gatewaySwaggerUrl = docs.gatewaySwaggerUrl;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load the backend documentation catalog right now.';
        this.loading = false;
      }
    });
  }
}
