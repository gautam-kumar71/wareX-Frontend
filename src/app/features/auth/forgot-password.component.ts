import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="logo-box">W</div>
          <h1>Forgot Password</h1>
          <p>Enter your email address and we will send an OTP for password reset.</p>
        </div>

        <form [formGroup]="emailForm" (ngSubmit)="requestOtp()">
          <div class="section-head">
            <span class="section-step">Step 1</span>
            <h3>Request OTP</h3>
          </div>

          <div class="form-group mb-4">
            <label>Email Address</label>
            <input type="email" formControlName="email" class="form-control" placeholder="name@company.com">
          </div>

          <button type="submit" class="btn btn-primary w-100" [disabled]="requestLoading">
            {{ requestLoading ? 'Sending OTP...' : 'Send OTP' }}
          </button>
        </form>

        <div class="auth-footer mt-5">
          <p>Remembered it? <a routerLink="/login">Back to Login</a></p>
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
    .auth-footer { text-align: center; border-top: 1px solid var(--border); padding-top: 2rem; }
    .auth-footer p { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }
    .auth-footer a { color: var(--primary); text-decoration: none; font-weight: 700; }
  `]
})
export class ForgotPasswordComponent {
  requestLoading = false;

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  requestOtp(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.requestLoading = true;
    const email = this.emailForm.getRawValue().email ?? '';
    this.authService.requestPasswordResetOtp({ email }).subscribe({
      next: (res) => {
        this.requestLoading = false;
        this.toastService.success(res.message || 'If the account is eligible, an OTP has been sent.');
        this.router.navigate(['/reset-password'], { queryParams: { email } });
      },
      error: () => {
        this.requestLoading = false;
      }
    });
  }
}
