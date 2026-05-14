import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { API_CONFIG } from '../../core/config/api.config';
import { PASSWORD_HINT, passwordStrengthValidators, passwordsMatchValidator } from '../../core/validation/auth-validation';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="logo-box">W</div>
          <h1>WareX</h1>
          <p>Register New Business Entity</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group mb-4">
            <label>Legal Full Name</label>
            <input type="text" formControlName="fullName" class="form-control" placeholder="John Doe"
              [class.error]="isFieldInvalid('fullName')">
            <small class="field-error" *ngIf="isFieldInvalid('fullName')">Full name must be at least 2 characters.</small>
          </div>

          <div class="form-group mb-4">
            <label>Corporate Identity (Email)</label>
            <input type="email" formControlName="email" class="form-control" placeholder="name@warex.com"
              [class.error]="isFieldInvalid('email')">
            <small class="field-error" *ngIf="isFieldInvalid('email')">Enter a valid email address.</small>
          </div>

          <div class="form-group mb-3">
            <label>Security Token (Password)</label>
            <input type="password" formControlName="password" class="form-control" placeholder="••••••••"
              [class.error]="isFieldInvalid('password')">
            <small class="field-hint">{{ passwordHint }}</small>
            <small class="field-error" *ngIf="shouldShowPasswordError()">
              Password must meet the required strength policy.
            </small>
          </div>

          <div class="form-group mb-5">
            <label>Confirm Security Token</label>
            <input type="password" formControlName="confirmPassword" class="form-control" placeholder="••••••••"
              [class.error]="isFieldInvalid('confirmPassword') || hasPasswordMismatch()">
            <small class="field-error" *ngIf="isFieldInvalid('confirmPassword')">Please confirm your password.</small>
            <small class="field-error" *ngIf="hasPasswordMismatch()">Passwords do not match.</small>
          </div>

          <button type="submit" class="btn btn-primary auth-submit w-100 mb-4" [disabled]="loading">
            {{ loading ? 'Provisioning Access...' : 'Create Account' }}
          </button>

          <div class="divider auth-divider mb-4"><span>OR USE</span></div>

          <div class="google-login-wrap">
            <div class="google-button-shell">
              <button
                type="button"
                class="google-ui-button"
                (click)="registerWithGoogle()"
              >
                <span class="google-mark" aria-hidden="true">
                  <span class="google-glyph">G</span>
                </span>
                <span>Continue with Google</span>
              </button>
              <div id="google-register-button" class="google-signin-slot" [class.hidden-google-slot]="googleUnavailable"></div>
            </div>
            <button
              *ngIf="googleUnavailable"
              type="button"
              (click)="registerWithGoogle()"
              class="btn btn-outline google-fallback-button w-100"
            >
              Continue with Google
            </button>
          </div>
        </form>

        <div class="auth-footer mt-5">
          <p>Already registered? <a routerLink="/login">Sign In</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; padding: 2rem; }
    .auth-card { width: 100%; max-width: 440px; padding: 3.5rem !important; border: 1px solid var(--border); }

    .auth-header { text-align: center; margin-bottom: 3.5rem; }
    .logo-box { width: 48px; height: 48px; background: var(--primary); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; margin: 0 auto 1.5rem; }
    .auth-header h1 { font-size: 1.75rem; font-weight: 900; color: white; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .auth-header p { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }

    label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block; }
    .field-hint { display: block; margin-top: 0.55rem; color: #94a3b8; font-size: 0.78rem; line-height: 1.5; }
    .field-error { display: block; margin-top: 0.55rem; color: #f87171; font-size: 0.78rem; line-height: 1.5; }
    .form-control.error { border-color: rgba(248, 113, 113, 0.8); box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.2); }
    .auth-submit { margin-bottom: 1.15rem !important; }
    .divider { position: relative; text-align: center; height: 1px; background: var(--border); }
    .auth-divider { margin: 1.1rem 0 1.25rem !important; }
    .divider span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); padding: 0 1rem; color: #334155; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; }
    .google-login-wrap { display: flex; flex-direction: column; justify-content: center; gap: 0.95rem; margin-bottom: 0.5rem; }
    .google-button-shell { position: relative; width: 100%; }
    .google-ui-button { width: 100%; min-height: 58px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(19,19,19,0.98), rgba(8,8,8,0.98)); color: #f8fafc; display: inline-flex; align-items: center; justify-content: center; gap: 0.95rem; font-size: 0.98rem; font-weight: 800; cursor: pointer; box-shadow: 0 18px 30px rgba(0,0,0,0.34); transition: all 0.2s ease; padding: 0 1.2rem; }
    .google-ui-button:hover { border-color: rgba(74, 124, 68, 0.4); background: linear-gradient(180deg, rgba(24,24,24,1), rgba(12,12,12,1)); transform: translateY(-1px); }
    .google-mark { width: 34px; height: 34px; border-radius: 10px; background: #050505; display: inline-flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.07); flex: 0 0 34px; }
    .google-glyph { color: #ffffff; font-size: 1.45rem; font-weight: 900; line-height: 1; transform: translateY(-1px); }
    .google-signin-slot { position: absolute; inset: 0; opacity: 0.01; overflow: hidden; border-radius: 16px; }
    .hidden-google-slot { pointer-events: none; }
    .google-signin-slot > div { width: 100% !important; }
    .google-fallback-button { min-height: 52px; font-size: 0.95rem; }

    .auth-footer { text-align: center; border-top: 1px solid var(--border); padding-top: 2.5rem; }
    .auth-footer p { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }
    .auth-footer a { color: var(--primary); text-decoration: none; font-weight: 700; margin-left: 0.25rem; }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  googleUnavailable = false;
  readonly passwordHint = PASSWORD_HINT;
  submitted = false;
  private googleInitialized = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', passwordStrengthValidators()],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatchValidator('password', 'confirmPassword') });
  }

  ngOnInit(): void {
    this.waitForGoogleAndInitialize();
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.submitted = true;
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitted = false;
    this.loading = true;
    const { email, fullName, password } = this.registerForm.getRawValue();
    this.authService.register({
      email: (email ?? '').trim(),
      fullName: (fullName ?? '').trim(),
      password: password ?? ''
    }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.loading = false
    });
  }

  registerWithGoogle() {
    this.waitForGoogleAndInitialize();
  }

  private initializeGoogleSignIn(): void {
    if (this.googleInitialized || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: API_CONFIG.googleClientId,
      callback: (response: GoogleCredentialResponse) => this.ngZone.run(() => this.handleGoogleCredential(response)),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    const container = document.getElementById('google-register-button');
    if (container) {
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 380,
        text: 'signup_with'
      });
    }

    this.googleInitialized = true;
    this.googleUnavailable = false;
  }

  private waitForGoogleAndInitialize(attempt: number = 0): void {
    if (window.google?.accounts?.id) {
      this.initializeGoogleSignIn();
      return;
    }

    if (attempt >= 20) {
      this.googleUnavailable = true;
      console.error('[RegisterComponent] Google Identity Services failed to load');
      return;
    }

    window.setTimeout(() => this.waitForGoogleAndInitialize(attempt + 1), 250);
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    if (!response.credential) {
      console.error('[RegisterComponent] Google credential response did not include an ID token');
      return;
    }

    this.loading = true;
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        console.error('[RegisterComponent] Google sign-up failed', err);
        this.loading = false;
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || this.submitted);
  }

  hasPasswordMismatch(): boolean {
    return !!this.registerForm.errors?.['mismatch']
      && !!this.registerForm.get('confirmPassword')?.touched;
  }

  shouldShowPasswordError(): boolean {
    const field = this.registerForm.get('password');
    if (!field || !field.invalid) {
      return false;
    }

    const hasValue = `${field.value ?? ''}`.length > 0;
    return (field.dirty && hasValue) || (this.submitted && !hasValue);
  }
}
