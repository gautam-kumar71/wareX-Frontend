import { FormBuilder } from '@angular/forms';
import { NgZone } from '@angular/core';
import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('Auth flow components', () => {
  const fb = new FormBuilder();

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete (window as any).google;
  });

  it('LoginComponent handles submit and Google auth branches', () => {
    const authService = {
      login: jest.fn(),
      loginWithGoogle: jest.fn()
    };
    const component = new LoginComponent(fb, authService as any, new NgZone({ enableLongStackTrace: false }));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    component.onSubmit();
    expect(authService.login).not.toHaveBeenCalled();

    authService.login.mockReturnValue(of({}));
    component.loginForm.patchValue({ email: 'user@warex.com', password: 'Secret123!' });
    component.onSubmit();
    expect(authService.login).toHaveBeenCalledWith({ email: 'user@warex.com', password: 'Secret123!' });
    expect(component.loading).toBe(false);

    authService.login.mockReturnValue(throwError(() => new Error('bad')));
    component.onSubmit();
    expect(component.loading).toBe(false);

    (component as any).handleGoogleCredential({});
    expect(errorSpy).toHaveBeenCalled();

    authService.loginWithGoogle.mockReturnValue(of({}));
    (component as any).handleGoogleCredential({ credential: 'google-id' });
    expect(authService.loginWithGoogle).toHaveBeenCalledWith('google-id');
    expect(component.loading).toBe(false);

    authService.loginWithGoogle.mockReturnValue(throwError(() => new Error('google-fail')));
    (component as any).handleGoogleCredential({ credential: 'google-id' });
    expect(component.loading).toBe(false);
  });

  it('LoginComponent initializes Google and falls back when the script never appears', () => {
    const authService = {
      login: jest.fn(),
      loginWithGoogle: jest.fn()
    };
    const component = new LoginComponent(fb, authService as any, new NgZone({ enableLongStackTrace: false }));
    const initialize = jest.fn();
    const renderButton = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    document.body.innerHTML = '<div id="google-signin-button"></div>';
    (window as any).google = {
      accounts: {
        id: {
          initialize,
          renderButton
        }
      }
    };

    component.ngOnInit();
    expect(initialize).toHaveBeenCalled();
    expect(renderButton).toHaveBeenCalled();
    expect(component.googleUnavailable).toBe(false);

    delete (window as any).google;
    jest.useFakeTimers();
    component.loginWithGoogle();
    jest.runAllTimers();
    expect(component.googleUnavailable).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('RegisterComponent handles submit and Google auth branches', () => {
    const authService = {
      register: jest.fn(),
      loginWithGoogle: jest.fn()
    };
    const router = { navigate: jest.fn() };
    const component = new RegisterComponent(
      fb,
      authService as any,
      router as any,
      new NgZone({ enableLongStackTrace: false })
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    component.onSubmit();
    expect(authService.register).not.toHaveBeenCalled();

    authService.register.mockReturnValue(of({}));
    component.registerForm.patchValue({
      fullName: 'User',
      email: 'user@warex.com',
      password: 'Secret123!',
      confirmPassword: 'Secret123!'
    });
    component.onSubmit();
    expect(authService.register).toHaveBeenCalledWith({ fullName: 'User', email: 'user@warex.com', password: 'Secret123!' });
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    authService.register.mockReturnValue(throwError(() => new Error('bad')));
    component.onSubmit();
    expect(component.loading).toBe(false);

    (component as any).handleGoogleCredential({});
    expect(errorSpy).toHaveBeenCalled();

    authService.loginWithGoogle.mockReturnValue(of({}));
    (component as any).handleGoogleCredential({ credential: 'google-register' });
    expect(authService.loginWithGoogle).toHaveBeenCalledWith('google-register');
    expect(component.loading).toBe(false);
  });

  it('ForgotPasswordComponent validates input and requests an OTP', () => {
    const authService = {
      requestPasswordResetOtp: jest.fn()
    };
    const toastService = {
      success: jest.fn()
    };
    const router = {
      navigate: jest.fn()
    };
    const component = new ForgotPasswordComponent(fb, authService as any, toastService as any, router as any);

    component.requestOtp();
    expect(authService.requestPasswordResetOtp).not.toHaveBeenCalled();

    authService.requestPasswordResetOtp.mockReturnValue(of({ message: 'OTP sent' }));
    component.emailForm.patchValue({ email: 'reset@warex.com' });
    component.requestOtp();

    expect(authService.requestPasswordResetOtp).toHaveBeenCalledWith({ email: 'reset@warex.com' });
    expect(toastService.success).toHaveBeenCalledWith('OTP sent');
    expect(router.navigate).toHaveBeenCalledWith(['/reset-password'], { queryParams: { email: 'reset@warex.com' } });

    authService.requestPasswordResetOtp.mockReturnValue(throwError(() => new Error('bad')));
    component.requestOtp();
    expect(component.requestLoading).toBe(false);
  });

  it('ResetPasswordComponent pre-fills email validates mismatches and resets passwords', () => {
    const authService = {
      resetPasswordWithOtp: jest.fn()
    };
    const toastService = {
      success: jest.fn(),
      warning: jest.fn()
    };
    const router = {
      navigate: jest.fn()
    };
    const route = {
      snapshot: {
        queryParamMap: convertToParamMap({ email: 'reset@warex.com' })
      }
    };
    const component = new ResetPasswordComponent(fb, authService as any, toastService as any, router as any, route as any);

    component.ngOnInit();
    expect(component.resetForm.value.email).toBe('reset@warex.com');

    component.resetPassword();
    expect(toastService.warning).toHaveBeenCalled();

    component.resetForm.patchValue({
      email: 'reset@warex.com',
      otp: '123456',
      newPassword: 'StrongPass1!',
      confirmPassword: 'WrongPass1!'
    });
    component.resetForm.get('confirmPassword')?.markAsTouched();
    expect(component.hasPasswordMismatch()).toBe(true);

    component.resetForm.patchValue({ confirmPassword: 'StrongPass1!' });
    authService.resetPasswordWithOtp.mockReturnValue(of({ message: 'Reset done' }));
    component.resetPassword();

    expect(authService.resetPasswordWithOtp).toHaveBeenCalledWith({
      email: 'reset@warex.com',
      otp: '123456',
      newPassword: 'StrongPass1!'
    });
    expect(toastService.success).toHaveBeenCalledWith('Reset done');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    authService.resetPasswordWithOtp.mockReturnValue(throwError(() => new Error('bad')));
    component.resetPassword();
    expect(component.resetLoading).toBe(false);
    expect(component.isFieldInvalid('email')).toBe(false);
  });
});
