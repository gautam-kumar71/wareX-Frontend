import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-oauth2-failure',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-error">
      <div class="error-icon">❌</div>
      <h2>Authentication Failed</h2>
      <p>We couldn't sign you in with Google. Please try again.</p>
      <button routerLink="/login" class="btn btn-primary">Back to Login</button>
    </div>
  `,
  styles: [`
    .auth-error { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: white; gap: 1.5rem; text-align: center; padding: 2rem; }
    .error-icon { font-size: 3rem; }
    h2 { font-size: 1.5rem; color: #ef4444; }
    p { color: #a3a3a3; max-width: 300px; line-height: 1.5; }
  `]
})
export class OAuth2FailureComponent {}
