import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-oauth2-success',
  standalone: true,
  template: `
    <div class="auth-loading">
      <div class="spinner"></div>
      <p>Finalizing login...</p>
    </div>
  `,
  styles: [`
    .auth-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: white; gap: 1rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid #222; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class OAuth2SuccessComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private tokenService: TokenService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        console.log('[OAuth2Success] Token received, handling auth...');
        this.tokenService.saveTokens({
          access_token: token,
          refresh_token: '',
          expires_in: 900,
          token_type: 'Bearer'
        });
        this.authService.fetchMe().subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/login'])
        });
      } else {
        console.error('[OAuth2Success] No token found in URL');
        this.router.navigate(['/login']);
      }
    });
  }
}
