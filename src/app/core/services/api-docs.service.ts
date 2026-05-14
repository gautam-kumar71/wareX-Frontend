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

  constructor(private http: HttpClient) {}

  getServiceDocs(): Observable<DocsCatalog> {
    return this.http.get<DocsCatalogResponse>(this.docsUrl).pipe(
      map(response => ({
        gatewayBaseUrl: response.gatewayBaseUrl,
        gatewaySwaggerUrl: response.gatewaySwaggerUrl,
        gatewayOpenApiUrl: response.gatewayOpenApiUrl,
        services: response.services
      }))
    );
  }
}
