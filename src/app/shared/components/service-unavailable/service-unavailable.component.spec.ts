import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceUnavailableComponent } from './service-unavailable.component';

describe('ServiceUnavailableComponent', () => {
  let fixture: ComponentFixture<ServiceUnavailableComponent>;
  let component: ServiceUnavailableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceUnavailableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceUnavailableComponent);
    component = fixture.componentInstance;
  });

  it('renders the service name and emits retry', () => {
    const retrySpy = jest.fn();
    component.serviceName = 'Payments';
    component.retry.subscribe(retrySpy);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Payments Offline');

    element.querySelector('button')?.click();
    expect(retrySpy).toHaveBeenCalled();
  });
});
