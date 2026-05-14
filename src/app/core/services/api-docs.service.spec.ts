import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiDocsService } from './api-docs.service';

describe('ApiDocsService', () => {
  let httpMock: HttpTestingController;
  let service: ApiDocsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiDocsService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ApiDocsService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('normalizes docs links onto the configured frontend gateway host', () => {
    let docsResponse: any;

    service.getServiceDocs().subscribe(response => {
      docsResponse = response;
    });

    const req = httpMock.expectOne(request => request.url.endsWith('/internal/docs/services'));
    const frontendGatewayOrigin = new URL(req.request.url).origin;
    expect(req.request.method).toBe('GET');
    req.flush({
      gatewayBaseUrl: 'http://host.docker.internal:8080',
      gatewaySwaggerUrl: 'http://host.docker.internal:8080/swagger',
      gatewayOpenApiUrl: 'http://host.docker.internal:8080/api-docs',
      services: [
        {
          serviceId: 'auth-service',
          displayName: 'Auth Service',
          description: 'Authentication APIs',
          gateway: false,
          baseUrl: 'http://host.docker.internal:8080',
          swaggerUiUrl: '',
          swaggerIndexUrl: '',
          openApiUrl: 'http://host.docker.internal:8080/service-docs/auth-service/api-docs',
          gatewayOpenApiUrl: '/service-docs/auth-service/api-docs',
          healthUrl: 'http://host.docker.internal:8080/actuator/health'
        }
      ]
    });

    expect(docsResponse.gatewayBaseUrl).toBe(`${frontendGatewayOrigin}/`);
    expect(docsResponse.gatewaySwaggerUrl).toBe(`${frontendGatewayOrigin}/swagger`);
    expect(docsResponse.gatewayOpenApiUrl).toBe(`${frontendGatewayOrigin}/api-docs`);
    expect(docsResponse.services[0].baseUrl).toBe(`${frontendGatewayOrigin}/`);
    expect(docsResponse.services[0].openApiUrl).toBe(`${frontendGatewayOrigin}/service-docs/auth-service/api-docs`);
    expect(docsResponse.services[0].gatewayOpenApiUrl).toBe(`${frontendGatewayOrigin}/service-docs/auth-service/api-docs`);
    expect(docsResponse.services[0].healthUrl).toBe(`${frontendGatewayOrigin}/actuator/health`);
  });
});
