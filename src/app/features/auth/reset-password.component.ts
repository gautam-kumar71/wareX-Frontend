import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PASSWORD_HINT, passwordStrengthValidators, passwordsMatchValidator } from '../../core/validation/auth-validation';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="logo-box">W</div>
          <h1>Reset Password</h1>
          <p>Enter the OTP from your email and choose a new password.</p>
        </div>

        <form [formGroup]="resetForm" (ngSubmit)="resetPassword()">
          <div class="section-head">
            <span class="section-step">Step 2</span>
            <h3>Verify OTP</h3>
          </div>

          <div class="form-group mb-3">
            <label>Email Address</label>
            <input type="email" formControlName="email" class="form-control" placeholder="name@company.com"
              [class.error]="isFieldInvalid('email')">
            <small class="field-error" *ngIf="isFieldInvalid('email')">Enter a valid email address.</small>
          </div>

          <div class="form-group mb-3">
            <label>OTP Code</label>
            <input type="text" formControlName="otp" class="form-control" maxlength="6" placeholder="123456"
              [class.error]="isFieldInvalid('otp')">
            <small class="field-error" *ngIf="isFieldInvalid('otp')">OTP must be exactly 6 digits.</small>
          </div>

          <div class="form-group mb-3">
            <label>New Password</label>
            <input type="password" formControlName="newPassword" class="form-control" placeholder="••••••••"
              [class.error]="isFieldInvalid('newPassword')">
            <small class="field-hint">{{ passwordHint }}</small>
            <small class="field-error" *ngIf="shouldShowPasswordError()">
              Enter a stronger password that matches the required format.
            </small>
          </div>

          <div class="form-group mb-4">
            <label>Confirm New Password</label>
            <input type="password" formControlName="confirmPassword" class="form-control" placeholder="••••••••"
              [class.error]="isFieldInvalid('confirmPassword') || hasPasswordMismatch()">
            <small class="field-error" *ngIf="isFieldInvalid('confirmPassword')">Please confirm your new password.</small>
            <small class="field-error" *ngIf="hasPasswordMismatch()">Passwords do not match.</small>
          </div>

          <button type="submit" class="btn btn-outline w-100" [disabled]="resetLoading">
            {{ resetLoading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </form>

        <div class="auth-footer mt-5">
          <p>Need a new OTP? <a routerLink="/forgot-password">Go Back</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; padding: 2rem 1rem; }
    .auth-card { width: 100%; max-width: 460px; padding: 3rem !important; border: 1px solid var(--border); }
    .auth-header { text-align: center; margin-bottom: 2.25rem; }
    .logo-box { width: 48px; height: 48px; background: var(--primary); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; margin: 0 auto 1.25rem; }
    .auth-header h1 { font-size: 1.75rem; font-weight: 900; color: white; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .auth-header p { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
    .section-head { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1rem; }
    .section-head h3 { margin: 0; color: white; font-size: 1rem; font-weight: 800; letter-spacing: 0.02em; }
    .section-step { display: inline-flex; align-items: center; justify-content: center; min-width: 3.5rem; height: 1.8rem; padding: 0 0.75rem; border-radius: 999px; background: rgba(74,124,68,0.14); color: var(--primary); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: block; }
    .field-hint { display: block; margin-top: 0.55rem; color: #94a3b8; font-size: 0.78rem; line-height: 1.5; }
    .field-error { display: block; margin-top: 0.55rem; color: #f87171; font-size: 0.78rem; line-height: 1.5; }
    .form-control.error { border-color: rgba(248, 113, 113, 0.8); box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.2); }
    .auth-footer { text-align: center; border-top: 1px solid var(--border); padding-top: 2rem; }
    .auth-footer p { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }
    .auth-footer a { color: var(--primary); text-decoration: none; font-weight: 700; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetLoading = false;
  readonly passwordHint = PASSWORD_HINT;
  submitted = false;

  resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', passwordStrengthValidators()],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatchValidator('newPassword', 'confirmPassword') });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.resetForm.patchValue({ email });
    }
  }

  resetPassword(): void {
    if (this.resetForm.invalid) {
      this.submitted = true;
      this.resetForm.markAllAsTouched();
      this.toastService.warning('Please fix the highlighted fields before resetting your password.');
      return;
    }

    const { email, otp, newPassword } = this.resetForm.getRawValue();
    this.resetLoading = true;
    this.authService.resetPasswordWithOtp({
      email: email ?? '',
      otp: otp ?? '',
      newPassword: newPassword ?? ''
    }).subscribe({
      next: (res) => {
        this.submitted = false;
        this.resetLoading = false;
        this.toastService.success(res.message || 'Password reset successful.');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.resetLoading = false;
      }
    });
  }
  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || this.submitted);
  }

  hasPasswordMismatch(): boolean {
    return !!this.resetForm.errors?.['mismatch']
      && !!this.resetForm.get('confirmPassword')?.touched;
  }

  shouldShowPasswordError(): boolean {
    const field = this.resetForm.get('newPassword');
    if (!field || !field.invalid) {
      return false;
    }

    const hasValue = `${field.value ?? ''}`.length > 0;
    return (field.dirty && hasValue) || (this.submitted && !hasValue);
  }
}
