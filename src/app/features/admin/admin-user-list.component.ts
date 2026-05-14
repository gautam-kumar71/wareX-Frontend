import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

type SystemRole = 'ADMIN' | 'INVENTORY_MANAGER' | 'PURCHASE_OFFICER' | 'WAREHOUSE_STAFF';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="header mb-5">
      <div class="title-group">
        <h2>User Management</h2>
        <p class="subtitle">Manage user roles and system access levels</p>
      </div>
    </div>

    <div class="table-card desktop-table">
      <table class="modern-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th class="text-right">Change Role</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of users">
            <td>
              <div class="user-cell">
                <div class="avatar-box">{{ user.fullName?.[0] || '?' }}</div>
                <span>{{ user.fullName || 'Unknown User' }}</span>
              </div>
            </td>
            <td class="text-muted">{{ user.email }}</td>
            <td>
              <span class="badge" [ngClass]="getRoleClass(user.role)">{{ getRoleLabel(user.role) }}</span>
            </td>
            <td class="text-right">
              <select class="role-selector"
                      [ngModel]="user.role"
                      (ngModelChange)="user.userId && onRoleChange(user.userId, $event)">
                <option *ngFor="let role of availableRoles" [value]="role">{{ getRoleLabel(role) }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="user-stack mobile-stack" *ngIf="users.length > 0">
      <article class="user-card" *ngFor="let user of users">
        <div class="user-card-head">
          <div class="user-cell">
            <div class="avatar-box">{{ user.fullName?.[0] || '?' }}</div>
            <div class="user-meta">
              <strong>{{ user.fullName || 'Unknown User' }}</strong>
              <span class="email-text">{{ user.email }}</span>
            </div>
          </div>
          <span class="badge" [ngClass]="getRoleClass(user.role)">{{ getRoleLabel(user.role) }}</span>
        </div>

        <div class="role-panel">
          <span class="field-label">Change Role</span>
          <select class="role-selector"
                  [ngModel]="user.role"
                  (ngModelChange)="user.userId && onRoleChange(user.userId, $event)">
            <option *ngFor="let role of availableRoles" [value]="role">{{ getRoleLabel(role) }}</option>
          </select>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .title-group h2 { font-size: 1.5rem; font-weight: 900; color: white; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; margin: 0; }
    .table-card { background: transparent; border: none; padding: 0; }
    .desktop-table { display: block; }
    .mobile-stack { display: none; }
    .user-stack { gap: 1rem; }
    .user-card { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; }
    .user-card-head { display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1rem; }
    .user-cell { display: flex; align-items: center; gap: 1rem; }
    .user-meta { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .email-text { color: var(--text-muted); font-size: 0.82rem; overflow-wrap: anywhere; }
    .avatar-box { width: 32px; height: 32px; border-radius: 8px; background: var(--primary-soft); color: var(--primary); font-size: 0.8rem; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); }
    .badge.admin { background: rgba(185, 28, 28, 0.1); color: #ef4444; }
    .badge.inventory_manager { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .badge.purchase_officer { background: rgba(168, 85, 247, 0.1); color: #c084fc; }
    .badge.warehouse_staff { background: rgba(63, 158, 55, 0.1); color: #10b981; }
    .role-panel { display: flex; flex-direction: column; gap: 0.45rem; }
    .field-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .role-selector { width: 100%; background: #000; border: 1px solid var(--border); color: white; padding: 0.7rem 0.85rem; border-radius: 10px; font-size: 0.75rem; cursor: pointer; outline: none; font-weight: 700; transition: all 0.2s; }
    .role-selector:focus { border-color: var(--primary); background: #050505; }
    .text-right { text-align: right; }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; }
      .desktop-table { display: none; }
      .mobile-stack { display: block; }
      .user-stack.mobile-stack { display: grid; }
      .user-cell { min-width: 0; align-items: flex-start; }
      .user-card { padding: 0.95rem; }
    }
  `]
})
export class AdminUserListComponent implements OnInit {
  users: User[] = [];
  readonly availableRoles: SystemRole[] = [
    'ADMIN',
    'INVENTORY_MANAGER',
    'PURCHASE_OFFICER',
    'WAREHOUSE_STAFF'
  ];

  constructor(private authService: AuthService) {}
  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.authService.getUsers().subscribe(res => { this.users = res.data; });
  }

  onRoleChange(userId: string, newRole: string) {
    if (confirm(`Change user role to ${newRole}?`)) {
      this.authService.updateUserRole(userId, newRole).subscribe(() => { this.loadUsers(); });
    }
  }

  getRoleClass(role?: string): string {
    return (role || '').toLowerCase();
  }

  getRoleLabel(role?: string): string {
    return role ? role.replace(/_/g, ' ') : 'UNKNOWN';
  }
}
