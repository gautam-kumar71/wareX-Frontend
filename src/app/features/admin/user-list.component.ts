import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header">
      <h2>System Users (Admin Only)</h2>
    </div>

    <div class="card table-card">
      <table class="minimal-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of users">
            <td><strong>{{ user.fullName }}</strong></td>
            <td>{{ user.email }}</td>
            <td><span class="badge badge-role">{{ user.role }}</span></td>
            <td>
              <button class="action-btn">Edit</button>
              <button class="action-btn danger">Disable</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .header { margin-bottom: 2rem; }
    .table-card { padding: 0; overflow: hidden; }
    .minimal-table { width: 100%; border-collapse: collapse; text-align: left; }
    .minimal-table th { background: #0a0a0a; padding: 1rem 1.5rem; font-size: 0.75rem; text-transform: uppercase; color: #a3a3a3; border-bottom: 1px solid #262626; }
    .minimal-table td { padding: 1.25rem 1.5rem; font-size: 0.875rem; border-bottom: 1px solid #262626; }
    .badge-role { background: rgba(249, 115, 22, 0.1); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.2); }
    .action-btn { background: transparent; border: 1px solid #333; color: #a3a3a3; padding: 0.375rem 0.75rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-right: 0.5rem; }
    .action-btn.danger:hover { color: #ef4444; border-color: #ef4444; }
  `]
})
export class AdminUserListComponent implements OnInit {
  users: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8080/api/v1/auth/admin/users').subscribe({
      next: (res) => this.users = res.data,
      error: (err) => console.error('Failed to fetch users', err)
    });
  }
}
