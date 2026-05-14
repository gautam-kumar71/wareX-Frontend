import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { PASSWORD_HINT, passwordStrengthValidators, passwordsMatchValidator } from '../../core/validation/auth-validation';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-wrapper">
      <div class="header-section mb-5">
        <h1>My Profile</h1>
        <p class="subtitle">Manage your personal information and password</p>
      </div>

      <div class="profile-grid">
        <!-- Profile Identity Card -->
        <div class="card identity-card">
          <div class="card-title-box mb-4">
            <h3>Personal Details</h3>
            <span class="badge approved">{{ user?.role }}</span>
          </div>
          
          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
            <div class="form-group mb-4">
              <label>Email Address</label>
              <input type="email" [value]="user?.email" disabled class="form-control disabled-state">
              <small class="text-muted mt-2 d-block">Your email address cannot be changed.</small>
            </div>

            <div class="form-group mb-4">
              <label>Full Name</label>
              <input type="text" formControlName="fullName" class="form-control"
                     [class.error]="profileForm.get('fullName')?.invalid && profileForm.get('fullName')?.touched">
            </div>

            <div class="mt-5">
              <button type="submit" [disabled]="profileForm.invalid || loading" class="btn btn-primary w-100">
                {{ loading ? 'Saving...' : 'Update Name' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Security Card -->
        <div class="card security-card" *ngIf="!user?.isOAuth2User; else oauthMessage">
          <div class="card-title-box mb-4">
            <h3>Change Password</h3>
          </div>
          
          <form [formGroup]="passwordForm" (ngSubmit)="onUpdatePassword()">
            <div class="form-group mb-3">
              <label>Current Password</label>
              <input type="password" formControlName="currentPassword" class="form-control" placeholder="••••••••"
                     [class.error]="isPasswordFieldInvalid('currentPassword')">
            </div>

            <div class="form-group mb-3">
              <label>New Password</label>
              <input type="password" formControlName="newPassword" class="form-control" placeholder="••••••••"
                     [class.error]="isPasswordFieldInvalid('newPassword')">
              <small class="text-muted mt-2 d-block">{{ passwordHint }}</small>
              <small class="text-danger mt-2 d-block" *ngIf="shouldShowProfilePasswordError()">
                Enter a stronger password that matches the required format.
              </small>
            </div>

            <div class="form-group mb-3">
              <label>Confirm Password</label>
              <input type="password" formControlName="confirmPassword" class="form-control" placeholder="••••••••"
                     [class.error]="isPasswordFieldInvalid('confirmPassword') || hasProfilePasswordMismatch()">
              <small class="text-danger mt-2 d-block" *ngIf="isPasswordFieldInvalid('confirmPassword')">
                Please confirm your new password.
              </small>
              <small class="text-danger mt-2 d-block" *ngIf="hasProfilePasswordMismatch()">
                Passwords do not match.
              </small>
            </div>

            <div class="mt-5">
              <button type="submit" [disabled]="passwordForm.invalid || passwordLoading" class="btn btn-outline w-100">
                {{ passwordLoading ? 'Changing...' : 'Update Password' }}
              </button>
            </div>
          </form>
        </div>

        <ng-template #oauthMessage>
          <div class="card security-card d-flex flex-column align-items-center justify-content-center text-center p-5">
            <div class="oauth-icon mb-4">G</div>
            <h3>Google Account</h3>
            <p class="text-muted mb-4">You are logged in with <strong>Google</strong>.</p>
            <a href="https://myaccount.google.com/security" target="_blank" class="btn btn-outline">Go to Google Security</a>
          </div>
        </ng-template>
      </div>

      <div class="toast-notification" *ngIf="message" [class.success]="isSuccess" [class.error]="!isSuccess">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .profile-wrapper { max-width: 1000px; margin: 0 auto; }
    .header-section h1 { font-size: 2.5rem; font-weight: 900; color: white; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1.1rem; font-weight: 500; }
    .profile-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 2rem; }
    @media (max-width: 992px) { .profile-grid { grid-template-columns: 1fr; } }
    .card-title-box { display: flex; justify-content: space-between; align-items: center; }
    .card-title-box h3 { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); margin: 0; }
    .disabled-state { opacity: 0.4; cursor: not-allowed; background: #000 !important; }
    .oauth-icon { width: 64px; height: 64px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; color: white; }
    .toast-notification { position: fixed; bottom: 2.5rem; right: 2.5rem; padding: 1rem 2rem; border-radius: 14px; color: white; font-weight: 700; font-size: 0.9rem; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); z-index: 10000; animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .toast-notification.success { background: rgba(63, 158, 55, 0.9); border-color: rgba(63, 158, 55, 0.2); }
    .toast-notification.error { background: rgba(185, 28, 28, 0.9); border-color: rgba(185, 28, 28, 0.2); }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  passwordLoading = false;
  message = '';
  isSuccess = true;
  readonly passwordHint = PASSWORD_HINT;
  passwordSubmitted = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', passwordStrengthValidators()],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatchValidator('newPassword', 'confirmPassword') });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profileForm.patchValue({ fullName: user.fullName });
      }
    });
  }
  onUpdateProfile() {
    if (this.profileForm.invalid) return;
    this.loading = true;
    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.showToast('Profile updated', true);
        this.loading = false;
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Update failed', false);
        this.loading = false;
      }
    });
  }

  onUpdatePassword() {
    if (this.passwordForm.invalid) {
      this.passwordSubmitted = true;
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSubmitted = false;
    this.passwordLoading = true;
    this.authService.updatePassword(this.passwordForm.value).subscribe({
      next: () => {
        this.passwordLoading = false;
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Password change failed', false);
        this.passwordLoading = false;
      }
    });
  }

  private showToast(msg: string, success: boolean) {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => this.message = '', 3000);
  }

  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || this.passwordSubmitted);
  }

  shouldShowProfilePasswordError(): boolean {
    const field = this.passwordForm.get('newPassword');
    if (!field || !field.invalid) {
      return false;
    }

    const hasValue = `${field.value ?? ''}`.length > 0;
    return (field.dirty && hasValue) || (this.passwordSubmitted && !hasValue);
  }

  hasProfilePasswordMismatch(): boolean {
    return !!this.passwordForm.errors?.['mismatch']
      && !!this.passwordForm.get('confirmPassword')?.touched;
  }
}
