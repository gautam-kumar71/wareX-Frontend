import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService, Invoice } from '../../core/services/invoice.service';
import { Payment, PaymentService } from '../../core/services/payment.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-hub',
  standalone: true,
  imports: [CommonModule, ServiceUnavailableComponent],
  template: `
    <section class="payment-page">
      <div class="header mb-4">
        <div class="title-group">
          <h2>Payments & Invoices</h2>
          <p class="subtitle">Invoices are created when a purchase order is approved. Payment must succeed before received stock is allowed to land in warehouse inventory.</p>
        </div>
        <button class="btn btn-outline" (click)="loadData()">Refresh</button>
      </div>

      <div class="flow-note">
        <span class="flow-chip">Approve PO</span>
        <span class="flow-arrow">→</span>
        <span class="flow-chip">Invoice Created</span>
        <span class="flow-arrow">→</span>
        <span class="flow-chip">Pay Invoice</span>
        <span class="flow-arrow">→</span>
        <span class="flow-chip">Receive Stock</span>
      </div>

      <div *ngIf="!serviceError; else errorState">
        <div class="row mb-4">
          <div class="col-md-4">
            <div class="card stat-card text-center">
              <div class="stat-label">Outstanding</div>
              <div class="stat-value danger">{{ formatCurrency(totalOutstanding) }}</div>
              <div class="stat-change">{{ payableCount }} invoice{{ payableCount === 1 ? '' : 's' }} awaiting payment</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card stat-card text-center">
              <div class="stat-label">Settled</div>
              <div class="stat-value success">{{ formatCurrency(totalPaid) }}</div>
              <div class="stat-change">{{ paidCount }} paid invoice{{ paidCount === 1 ? '' : 's' }}</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card stat-card text-center">
              <div class="stat-label">Overdue</div>
              <div class="stat-value warning">{{ overdueCount }}</div>
              <div class="stat-change">Needs attention</div>
            </div>
          </div>
        </div>

        <div class="table-card desktop-table">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Purchase Order</th>
                <th>Vendor</th>
                <th class="text-end">Amount</th>
                <th>Due Date</th>
                <th>Invoice Status</th>
                <th>PO Stage</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td><code>{{ inv.invoiceNumber }}</code></td>
                <td>
                  <strong>#{{ inv.orderNumber || 'N/A' }}</strong>
                  <div class="text-muted small-copy">{{ flowHint(inv) }}</div>
                </td>
                <td><strong>{{ inv.supplierName }}</strong></td>
                <td class="text-end amount-cell">{{ formatCurrency(inv.amount) }}</td>
                <td>
                  <div>{{ inv.dueDate | date:'mediumDate' }}</div>
                  <div class="text-muted small-copy">{{ dueLabel(inv) }}</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="invoiceStatusClass(displayInvoiceStatus(inv))">
                    {{ invoiceStatusLabel(displayInvoiceStatus(inv)) }}
                  </span>
                </td>
                <td>
                  <span class="badge muted" [ngClass]="poStatusClass(inv.purchaseOrderStatus)">
                    {{ poStatusLabel(inv.purchaseOrderStatus) }}
                  </span>
                </td>
                <td class="text-center">
                  <button *ngIf="canPayInvoice(inv)"
                          class="btn btn-primary btn-sm"
                          [disabled]="isProcessing(inv)"
                          (click)="processPayment(inv)">
                    {{ isProcessing(inv) ? 'Processing...' : 'Pay Now' }}
                  </button>
                  <span *ngIf="showAwaitApproval(inv)" class="state-pill neutral">Await Approval</span>
                  <span *ngIf="inv.status === 'PAID'" class="state-pill success">Paid</span>
                  <span *ngIf="isEffectivelyClosed(inv)" class="state-pill neutral">Closed</span>
                </td>
              </tr>
              <tr *ngIf="invoices.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-icon">IN</div>
                  <p>No invoices found.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="invoice-stack mobile-stack" *ngIf="invoices.length > 0">
          <article class="invoice-card" *ngFor="let inv of invoices">
            <div class="invoice-card-head">
              <div>
                <div class="field-label">Invoice</div>
                <code>{{ inv.invoiceNumber }}</code>
              </div>
              <span class="badge" [ngClass]="invoiceStatusClass(displayInvoiceStatus(inv))">
                {{ invoiceStatusLabel(displayInvoiceStatus(inv)) }}
              </span>
            </div>

            <div class="invoice-grid">
              <div class="invoice-field">
                <span class="field-label">Purchase Order</span>
                <strong>#{{ inv.orderNumber || 'N/A' }}</strong>
                <span class="text-muted small-copy">{{ poStatusLabel(inv.purchaseOrderStatus) }}</span>
              </div>
              <div class="invoice-field">
                <span class="field-label">Vendor</span>
                <strong>{{ inv.supplierName }}</strong>
              </div>
              <div class="invoice-field">
                <span class="field-label">Amount</span>
                <strong class="amount-value">{{ formatCurrency(inv.amount) }}</strong>
              </div>
              <div class="invoice-field">
                <span class="field-label">Due Date</span>
                <strong>{{ inv.dueDate | date:'mediumDate' }}</strong>
                <span class="text-muted small-copy">{{ dueLabel(inv) }}</span>
              </div>
            </div>

            <p class="flow-copy">{{ flowHint(inv) }}</p>

            <div class="invoice-actions">
              <button *ngIf="canPayInvoice(inv)"
                      class="btn btn-primary"
                      [disabled]="isProcessing(inv)"
                      (click)="processPayment(inv)">
                {{ isProcessing(inv) ? 'Processing...' : 'Pay Now' }}
              </button>
              <span *ngIf="showAwaitApproval(inv)" class="state-pill neutral">Await Approval</span>
              <span *ngIf="inv.status === 'PAID'" class="paid-pill">Paid</span>
              <span *ngIf="isEffectivelyClosed(inv)" class="state-pill neutral">Closed</span>
            </div>
          </article>
        </div>

        <div class="mobile-empty-state mobile-stack" *ngIf="invoices.length === 0">
          <div class="empty-icon">IN</div>
          <p>No invoices found.</p>
        </div>

        <section class="reversal-panel" *ngIf="canManagePaymentReversals() && cancellableInvoices.length > 0">
          <div class="section-head">
            <div class="section-title">
              <h3>Payment Reversal Desk</h3>
              <span>Restricted to admins and purchase officers</span>
            </div>
          </div>
          <p class="reversal-copy">
            Use this only when a settled invoice must be reversed. Cancelling a payment here also cancels the linked purchase order.
          </p>
          <div class="reversal-list">
            <article class="reversal-card" *ngFor="let inv of cancellableInvoices">
              <div>
                <strong>{{ inv.invoiceNumber }}</strong>
                <div class="text-muted">PO #{{ inv.orderNumber || 'N/A' }} • {{ inv.supplierName }}</div>
              </div>
              <div class="reversal-actions">
                <span class="reversal-amount">{{ formatCurrency(inv.amount) }}</span>
                <button class="btn btn-outline btn-sm"
                        [disabled]="isCancelling(inv)"
                        (click)="cancelPayment(inv)">
                  {{ isCancelling(inv) ? 'Cancelling...' : 'Cancel Payment' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <div class="payment-history" *ngIf="allPayments.length > 0">
          <div class="section-head">
            <div class="section-title">
              <h3>{{ showAllPayments ? 'All Payments' : 'Recent Payments' }}</h3>
              <span>{{ displayedPayments.length }} settled transaction{{ displayedPayments.length === 1 ? '' : 's' }}</span>
            </div>
            <button class="btn btn-outline btn-sm history-toggle" type="button" (click)="togglePaymentHistory()">
              {{ showAllPayments ? 'Show Recent' : 'Show All' }}
            </button>
          </div>
          <div class="history-list">
            <div class="history-row" *ngFor="let payment of displayedPayments">
              <div>
                <strong>{{ payment.transactionId }}</strong>
                <div class="text-muted">{{ payment.invoiceNumber }}<span *ngIf="payment.processedBy"> • {{ payment.processedBy }}</span></div>
              </div>
              <div class="history-meta">
                <strong>{{ formatCurrency(payment.amount) }}</strong>
                <span>{{ payment.createdAt | date:'medium' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #errorState>
        <app-service-unavailable
          [serviceName]="unavailableServiceName"
          (retry)="loadData()">
        </app-service-unavailable>
      </ng-template>
    </section>
  `,
  styles: [`
    .payment-page { width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1.25rem; margin-bottom: 0; }
    .title-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .title-group h2 { font-size: clamp(1.5rem, 2vw, 1.9rem); font-weight: 900; color: white; margin: 0; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 1.02rem; font-weight: 500; margin: 0; max-width: 48rem; }
    .flow-note { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0; padding: 1rem 1.1rem; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, rgba(74,124,68,0.16), rgba(255,255,255,0.02)); }
    .flow-chip { padding: 0.55rem 0.85rem; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: white; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
    .flow-arrow { color: var(--text-muted); font-weight: 900; }
    .row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 0 !important; }
    .col-md-4 { min-width: 0; }
    .stat-card { padding: clamp(1.35rem, 2vw, 2rem) 1.25rem; background: #080808; border: 1px solid var(--border); min-height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 0.6rem; }
    .stat-label { font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 0.55rem; }
    .stat-value { font-size: clamp(1.85rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -0.01em; margin-bottom: 0.2rem; }
    .stat-value.danger { color: #ef4444; }
    .stat-value.success { color: #22c55e; }
    .stat-value.warning { color: #f59e0b; }
    .stat-change { color: #64748b; font-weight: 600; font-size: 0.92rem; }
    .table-card { background: transparent; border: none; padding: 0; }
    .desktop-table { display: block; }
    .mobile-stack { display: none; }
    .invoice-stack { gap: 1rem; }
    .invoice-card { background: #0b0b0b; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; }
    .invoice-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
    .invoice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
    .invoice-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .field-label { color: var(--text-muted); font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .amount-value { color: white; font-size: 1rem; }
    .invoice-actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
    .flow-copy { margin: 1rem 0 0; color: #94a3b8; font-size: 0.95rem; }
    .paid-pill, .state-pill { display: inline-flex; align-items: center; justify-content: center; padding: 0.65rem 1rem; border-radius: 999px; font-size: 0.86rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .paid-pill, .state-pill.success { background: rgba(34,197,94,0.12); color: #4ade80; }
    .state-pill.neutral { background: rgba(148,163,184,0.12); color: #cbd5e1; }
    .mobile-empty-state { text-align: center; padding: 2.5rem 1.25rem; background: #0b0b0b; border: 1px solid var(--border); border-radius: 18px; color: #64748b; }
    .reversal-panel { margin-top: 0.25rem; border: 1px solid rgba(248,113,113,0.24); border-radius: 18px; padding: 1.25rem; background: linear-gradient(180deg, rgba(127,29,29,0.18), rgba(11,11,11,0.96)); }
    .reversal-copy { margin: 0 0 1rem; color: #fecaca; font-size: 0.94rem; max-width: 60ch; }
    .reversal-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .reversal-card { display: flex; justify-content: space-between; gap: 1rem; align-items: center; border: 1px solid rgba(248,113,113,0.16); border-radius: 14px; padding: 0.95rem 1rem; background: rgba(10,10,10,0.76); }
    .reversal-actions { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: flex-end; }
    .reversal-amount { color: #f8fafc; font-weight: 800; }
    .payment-history { margin-top: 0.25rem; border: 1px solid var(--border); border-radius: 18px; padding: 1.25rem; background: #0b0b0b; }
    .section-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .section-title { display: flex; flex-direction: column; gap: 0.35rem; }
    .section-head h3 { margin: 0; font-size: 1.1rem; }
    .section-head span { color: var(--text-muted); font-size: 0.95rem; }
    .history-toggle { width: auto; min-height: 0; padding: 0.65rem 1rem; font-size: 0.82rem; }
    .history-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .history-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; border: 1px solid var(--border); border-radius: 12px; padding: 0.9rem 1rem; background: #111; }
    .history-row > :first-child { min-width: 0; }
    .history-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; color: var(--text-muted); font-size: 0.92rem; }
    .badge { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 0.9rem; border-radius: 999px; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid transparent; }
    .badge.pending { background: rgba(234,179,8,0.12); color: #facc15; }
    .badge.approved { background: rgba(59,130,246,0.12); color: #60a5fa; }
    .badge.overdue { background: rgba(239,68,68,0.12); color: #f87171; }
    .badge.paid { background: rgba(34,197,94,0.12); color: #4ade80; }
    .badge.cancelled { background: rgba(148,163,184,0.12); color: #cbd5e1; }
    .badge.po-approved { background: rgba(37,99,235,0.12); color: #60a5fa; }
    .badge.po-partially-received { background: rgba(14,165,233,0.12); color: #67e8f9; }
    .badge.po-received { background: rgba(34,197,94,0.12); color: #4ade80; }
    .badge.po-submitted, .badge.po-draft, .badge.po-cancelled { background: rgba(148,163,184,0.12); color: #cbd5e1; }
    .small-copy { font-size: 0.9rem; }
    .amount-cell { font-weight: 800; color: white; }
    .empty-state { text-align: center; padding: 5rem 2rem !important; color: #64748b; }
    .empty-icon { width: 3rem; height: 3rem; margin: 0 auto 1rem; border-radius: 999px; display: grid; place-items: center; font-size: 0.85rem; font-weight: 900; letter-spacing: 0.12em; color: #4ade80; background: rgba(74,124,68,0.14); border: 1px solid rgba(74,124,68,0.3); }
    code { background: rgba(255,255,255,0.03); color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.92rem; overflow-wrap: anywhere; }
    .text-end { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-muted); }
    @media (max-width: 980px) {
      .header { align-items: flex-start; }
      .row { grid-template-columns: 1fr; gap: 0.9rem; }
    }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header .btn { width: 100%; }
      .payment-page { gap: 1.1rem; }
      .desktop-table { display: none; }
      .mobile-stack { display: block; }
      .invoice-stack.mobile-stack { display: grid; }
      .invoice-grid { grid-template-columns: 1fr; }
      .invoice-card-head { flex-direction: column; }
      .invoice-actions { justify-content: stretch; }
      .invoice-actions .btn,
      .invoice-actions .state-pill,
      .invoice-actions .paid-pill { width: 100%; }
      .reversal-panel { padding: 1rem; }
      .payment-history { padding: 1rem; }
      .section-head { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
      .history-toggle { width: 100%; }
      .history-row { flex-direction: column; align-items: flex-start; }
      .history-meta { align-items: flex-start; }
      .reversal-card { flex-direction: column; align-items: flex-start; }
      .reversal-actions { width: 100%; justify-content: stretch; }
      .reversal-actions .btn { width: 100%; }
      .flow-note { gap: 0.5rem; }
      .flow-arrow { display: none; }
    }
    @media (max-width: 480px) {
      .flow-chip,
      .badge,
      .paid-pill,
      .state-pill { width: 100%; justify-content: center; }
      .invoice-card,
      .mobile-empty-state,
      .payment-history { border-radius: 16px; }
    }
  `]
})
export class PaymentHubComponent implements OnInit {
  private readonly razorpayKey = environment.razorpayKeyId;
  private readonly inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
  invoices: Invoice[] = [];
  payments: Payment[] = [];
  totalOutstanding = 0;
  totalPaid = 0;
  payableCount = 0;
  paidCount = 0;
  overdueCount = 0;
  serviceError = false;
  unavailableServiceName = 'Billing Services';
  processingInvoices = new Set<string>();
  cancellingInvoices = new Set<string>();
  showAllPayments = false;

  constructor(
    private invoiceService: InvoiceService,
    private paymentService: PaymentService,
    private toast: ToastService,
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.serviceError = false;
    this.unavailableServiceName = 'Billing Services';
    this.invoiceService.searchInvoices(undefined, undefined, 0, 50).subscribe({
      next: (page) => {
        this.invoices = page.content;
        this.calculateStats();
        this.loadPayments();
      },
      error: (err) => {
        this.serviceError = true;
        this.unavailableServiceName = 'Invoice Service';
        this.toast.error(err?.error?.message || 'Failed to load invoices');
      }
    });
  }

  loadPayments() {
    this.paymentService.getPayments(0, 200).subscribe({
      next: (page) => {
        this.payments = page.content;
        this.calculateStats();
      },
      error: (err) => {
        this.payments = [];
        this.toast.error(err?.error?.message || 'Failed to load payment history');
      }
    });
  }

  calculateStats() {
    this.totalOutstanding = this.invoices
      .filter(invoice => this.isOutstandingInvoice(invoice))
      .reduce((acc, invoice) => acc + invoice.amount, 0);

    this.totalPaid = this.invoices
      .filter(invoice => invoice.status === 'PAID')
      .reduce((acc, invoice) => acc + invoice.amount, 0);

    this.payableCount = this.invoices.filter(invoice => this.isOutstandingInvoice(invoice)).length;
    this.paidCount = this.invoices.filter(invoice => invoice.status === 'PAID').length;
    this.overdueCount = this.invoices.filter(invoice => invoice.status === 'OVERDUE').length;
  }

  isPayable(invoice: Invoice): boolean {
    return !this.isEffectivelyClosed(invoice) && ['PENDING', 'APPROVED', 'OVERDUE'].includes(invoice.status);
  }

  isOutstandingInvoice(invoice: Invoice): boolean {
    return !this.isEffectivelyClosed(invoice) && ['PENDING', 'APPROVED', 'OVERDUE'].includes(invoice.status);
  }

  canPayInvoice(invoice: Invoice): boolean {
    return this.isPayable(invoice)
      && ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(invoice.purchaseOrderStatus);
  }

  showAwaitApproval(invoice: Invoice): boolean {
    return this.isPayable(invoice)
      && !['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(invoice.purchaseOrderStatus);
  }

  isProcessing(invoice: Invoice): boolean {
    return this.processingInvoices.has(invoice.invoiceNumber);
  }

  isCancelling(invoice: Invoice): boolean {
    return this.cancellingInvoices.has(invoice.invoiceNumber);
  }

  get recentPayments(): Payment[] {
    const paidInvoiceNumbers = new Set(
      this.invoices
        .filter(invoice => invoice.status === 'PAID')
        .map(invoice => invoice.invoiceNumber)
    );

    const dedupedByInvoice = new Map<string, Payment>();
    this.payments
      .filter(payment => paidInvoiceNumbers.has(payment.invoiceNumber) && payment.status !== 'CANCELLED')
      .sort((left, right) => this.paymentTimestamp(right) - this.paymentTimestamp(left))
      .forEach(payment => {
        if (!dedupedByInvoice.has(payment.invoiceNumber)) {
          dedupedByInvoice.set(payment.invoiceNumber, payment);
        }
      });

    return Array.from(dedupedByInvoice.values()).slice(0, 10);
  }

  get allPayments(): Payment[] {
    return [...this.payments]
      .sort((left, right) => this.paymentTimestamp(right) - this.paymentTimestamp(left));
  }

  get displayedPayments(): Payment[] {
    return this.showAllPayments ? this.allPayments : this.recentPayments;
  }

  get cancellableInvoices(): Invoice[] {
    return this.invoices.filter(invoice => this.canCancelPayment(invoice));
  }

  formatCurrency(amount: number | null | undefined): string {
    return this.inrFormatter.format(amount ?? 0);
  }

  invoiceStatusClass(status: string): string {
    return status.toLowerCase();
  }

  invoiceStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Awaiting Payment';
      case 'APPROVED':
        return 'Approved';
      case 'OVERDUE':
        return 'Overdue';
      case 'PAID':
        return 'Paid';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  displayInvoiceStatus(invoice: Invoice): string {
    return this.isCancelledByPurchaseOrder(invoice) ? 'CANCELLED' : invoice.status;
  }

  poStatusClass(status?: string): string {
    return 'po-' + (status || 'unknown').toLowerCase().replace(/_/g, '-');
  }

  poStatusLabel(status?: string): string {
    return (status || 'UNKNOWN').replace(/_/g, ' ');
  }

  flowHint(invoice: Invoice): string {
    const poStatus = invoice.purchaseOrderStatus || '';
    if (poStatus === 'CANCELLED') {
      return 'This invoice was closed because the purchase order was cancelled.';
    }
    if (poStatus === 'APPROVED') {
      return 'Invoice is ready for payment. Once payment succeeds, warehouse receipt can begin.';
    }
    if (poStatus === 'PARTIALLY_RECEIVED') {
      return 'Payment is settled and stock receipt is in progress.';
    }
    if (poStatus === 'RECEIVED') {
      return 'Payment is settled and all received stock is already reflected in warehouse inventory.';
    }
    return 'Invoice was created from the purchase-order approval flow.';
  }

  dueLabel(invoice: Invoice): string {
    if (this.isCancelledByPurchaseOrder(invoice)) {
      return 'Closed';
    }
    if (invoice.status === 'PAID') {
      return 'Settled';
    }
    if (invoice.status === 'CANCELLED') {
      return 'Closed';
    }
    if (invoice.status === 'OVERDUE') {
      return 'Past due';
    }
    const dueTime = new Date(invoice.dueDate).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    if (dueTime < todayTime) {
      return 'Past due';
    }
    if (dueTime === todayTime) {
      return 'Due today';
    }
    return 'Open';
  }

  togglePaymentHistory() {
    this.showAllPayments = !this.showAllPayments;
  }

  canManagePaymentReversals(): boolean {
    return this.authService.canCancelPayments();
  }

  processPayment(invoice: Invoice) {
    if (!this.canPayInvoice(invoice)) {
      this.toast.warning('Payment is unlocked only after the purchase order is approved');
      return;
    }

    this.processingInvoices.add(invoice.invoiceNumber);

    const request = {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      paymentMethod: 'RAZORPAY'
    };

    if (!(window as any).Razorpay || !this.isRazorpayConfigured()) {
      if (this.isRazorpayConfigured()) {
        this.toast.warning('Razorpay checkout is unavailable. Processing as a manual payment instead.');
      } else {
        this.toast.warning('Razorpay is not configured yet. Processing as a manual payment instead.');
      }
      this.processManualPayment(invoice);
      return;
    }

    this.paymentService.createRazorpayOrder(request).subscribe({
      next: (order) => {
        const options = {
          key: this.razorpayKey,
          amount: order.amount * 100,
          currency: order.currency,
          name: 'WareX Logistics',
          description: `Payment for Invoice ${invoice.invoiceNumber}`,
          order_id: order.razorpayOrderId,
          handler: (response: any) => {
            this.ngZone.run(() => this.verifyPayment(response, invoice.invoiceNumber));
          },
          prefill: {
            name: '',
            email: '',
            contact: ''
          },
          modal: {
            ondismiss: () => {
              this.ngZone.run(() => {
                this.processingInvoices.delete(invoice.invoiceNumber);
              });
            }
          },
          theme: {
            color: '#4A7C44'
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', () => {
          this.ngZone.run(() => {
            this.processingInvoices.delete(invoice.invoiceNumber);
            this.toast.error('Payment failed before verification completed');
          });
        });
        rzp.open();
      },
      error: (err) => {
        this.processingInvoices.delete(invoice.invoiceNumber);
        this.toast.warning(err?.error?.message || 'Razorpay is unavailable right now. Processing as a manual payment instead.');
        this.processManualPayment(invoice);
      }
    });
  }

  private isRazorpayConfigured(): boolean {
    return !!this.razorpayKey && this.razorpayKey !== 'rzp_test_YourKeyId';
  }

  private verifyPayment(razorpayResponse: any, invoiceNumber: string) {
    const invoice = this.invoices.find(item => item.invoiceNumber === invoiceNumber);
    const verifyRequest = {
      razorpayPaymentId: razorpayResponse.razorpay_payment_id,
      razorpayOrderId: razorpayResponse.razorpay_order_id,
      razorpaySignature: razorpayResponse.razorpay_signature,
      invoiceNumber,
      amount: invoice?.amount ?? 0
    };

    this.paymentService.verifyRazorpayPayment(verifyRequest).subscribe({
      next: (payment) => {
        this.applySuccessfulPayment(invoiceNumber, payment);
        this.toast.success('Payment verified and completed');
        this.loadData();
      },
      error: (err) => {
        this.processingInvoices.delete(invoiceNumber);
        const serverMessage = err?.error?.message || err?.error?.error || '';
        if (serverMessage) {
          this.toast.error(serverMessage);
        } else {
          this.toast.error('Payment could not be confirmed right now. Please try again in a moment.');
        }
        this.loadData();
      }
    });
  }

  private processManualPayment(invoice: Invoice) {
    this.paymentService.processPayment({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      paymentMethod: 'MANUAL'
    }).subscribe({
      next: (payment) => {
        this.applySuccessfulPayment(invoice.invoiceNumber, payment);
        this.toast.success('Payment processed successfully');
        this.loadData();
      },
      error: (err) => {
        this.processingInvoices.delete(invoice.invoiceNumber);
        const serverMessage = err?.error?.message || err?.error?.error || '';
        if (serverMessage) {
          this.toast.error(serverMessage);
        } else {
          this.toast.error('Payment could not be completed right now. Please try again in a moment.');
        }
        this.loadData();
      }
    });
  }

  private applySuccessfulPayment(invoiceNumber: string, payment: Payment) {
    this.processingInvoices.delete(invoiceNumber);
    this.invoices = this.invoices.map(invoice =>
      invoice.invoiceNumber === invoiceNumber
        ? { ...invoice, status: 'PAID' }
        : invoice
    );
    this.payments = [payment, ...this.payments].slice(0, 10);
    this.calculateStats();
  }

  canCancelPayment(invoice: Invoice): boolean {
    return invoice.status === 'PAID'
      && !this.isEffectivelyClosed(invoice)
      && !!this.getLatestActivePayment(invoice.invoiceNumber);
  }

  cancelPayment(invoice: Invoice) {
    const payment = this.getLatestActivePayment(invoice.invoiceNumber);
    if (!payment) {
      this.toast.error('No active payment record was found for this invoice');
      return;
    }

    const reason = prompt(`Enter a reason to cancel payment ${payment.transactionId} and cancel order ${invoice.orderNumber}:`);
    if (!reason?.trim()) {
      return;
    }

    this.cancellingInvoices.add(invoice.invoiceNumber);
    this.paymentService.cancelPayment(payment.transactionId, reason.trim()).subscribe({
      next: (updatedPayment) => {
        this.cancellingInvoices.delete(invoice.invoiceNumber);
        this.payments = this.payments.map(item =>
          item.transactionId === updatedPayment.transactionId ? updatedPayment : item
        );
        this.invoices = this.invoices.map(item =>
          item.invoiceNumber === invoice.invoiceNumber
            ? { ...item, status: 'CANCELLED', purchaseOrderStatus: 'CANCELLED' }
            : item
        );
        this.calculateStats();
        this.toast.success('Payment cancelled and linked purchase order cancelled successfully');
        this.loadData();
      },
      error: (err) => {
        this.cancellingInvoices.delete(invoice.invoiceNumber);
        this.toast.error(err?.error?.message || 'Failed to cancel payment');
        this.loadData();
      }
    });
  }

  private paymentTimestamp(payment: Payment): number {
    return payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
  }

  isEffectivelyClosed(invoice: Invoice): boolean {
    return invoice.status === 'CANCELLED' || this.isCancelledByPurchaseOrder(invoice);
  }

  private isCancelledByPurchaseOrder(invoice: Invoice): boolean {
    return (invoice.purchaseOrderStatus || '').toUpperCase() === 'CANCELLED';
  }

  private getLatestActivePayment(invoiceNumber: string): Payment | undefined {
    return [...this.payments]
      .filter(payment => payment.invoiceNumber === invoiceNumber && payment.status !== 'CANCELLED')
      .sort((left, right) => this.paymentTimestamp(right) - this.paymentTimestamp(left))[0];
  }
}
