import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows and auto-removes toasts', () => {
    service.show('hello', 'info', 1000);

    let toasts: any[] = [];
    service.toasts$.subscribe((value) => {
      toasts = value;
    });

    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('hello');

    jest.advanceTimersByTime(1000);
    expect(toasts).toHaveLength(0);
  });

  it('delegates helper methods to show and can remove manually', () => {
    service.success('ok', 10);
    service.error('bad', 10);
    service.warning('warn', 10);

    let toasts: any[] = [];
    service.toasts$.subscribe((value) => {
      toasts = value;
    });

    expect(toasts.map((toast) => toast.type)).toEqual(['success', 'error', 'warning']);

    service.remove(toasts[1]);
    expect(toasts.map((toast) => toast.type)).toEqual(['success', 'warning']);
  });
});
