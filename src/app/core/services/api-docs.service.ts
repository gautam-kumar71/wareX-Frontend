import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface ServiceDocLink {
  serviceId: string;
  displayName: string;
  description: string;
  gateway: boolean;
  baseUrl: string;
  swaggerUiUrl: string;
  swaggerIndexUrl: string;
  openApiUrl: string;
  gatewayOpenApiUrl: string;
  healthUrl: string;
}

interface DocsCatalogResponse {
  gatewayBaseUrl: string;
  gatewaySwaggerUrl: string;
  gatewayOpenApiUrl: string;
  services: ServiceDocLink[];
}

export interface DocsCatalog {
  gatewayBaseUrl: string;
  gatewaySwaggerUrl: string;
  gatewayOpenApiUrl: string;
  services: ServiceDocLink[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiDocsService {
  private readonly docsUrl = `${API_CONFIG.gateway || ''}/internal/docs/services`;
  private readonly gatewayBaseUrl = API_CONFIG.gateway || '';

  constructor(private http: HttpClient) {}

  getServiceDocs(): Observable<DocsCatalog> {
    return this.http.get<DocsCatalogResponse>(this.docsUrl).pipe(
      map(response => ({
        gatewayBaseUrl: this.normalizeGatewayUrl(response.gatewayBaseUrl),
        gatewaySwaggerUrl: this.normalizeGatewayUrl(response.gatewaySwaggerUrl),
        gatewayOpenApiUrl: this.normalizeGatewayUrl(response.gatewayOpenApiUrl),
        services: response.services.map(service => ({
          ...service,
          baseUrl: this.normalizeGatewayUrl(service.baseUrl),
          swaggerUiUrl: this.normalizeGatewayUrl(service.swaggerUiUrl),
          swaggerIndexUrl: this.normalizeGatewayUrl(service.swaggerIndexUrl),
          openApiUrl: this.normalizeGatewayUrl(service.openApiUrl),
          gatewayOpenApiUrl: this.normalizeGatewayUrl(service.gatewayOpenApiUrl),
          healthUrl: this.normalizeGatewayUrl(service.healthUrl)
        }))
      }))
    );
  }

  private normalizeGatewayUrl(url: string): string {
    if (!url) {
      return url;
    }

    if (!this.gatewayBaseUrl) {
      return url;
    }

    try {
      const parsedUrl = new URL(url, this.gatewayBaseUrl);
      return `${this.gatewayBaseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch {
      return url;
    }
  }
}
