import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { ReportService, DashboardStats } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header">
      <h2>Operational Intelligence</h2>
      <button class="btn btn-primary" (click)="refreshStats()">Refresh Insights</button>
    </div>

    <div class="stats-grid" *ngIf="stats">
      <div class="stat-card">
        <h3>Total Warehouses</h3>
        <p class="value">{{ stats.totalWarehouses }}</p>
        <span class="trend">Across 4 countries</span>
      </div>
      <div class="stat-card">
        <h3>Active Suppliers</h3>
        <p class="value">{{ stats.activeSuppliers }}</p>
        <span class="trend">Primary partners</span>
      </div>
      <div class="stat-card">
        <h3>Inventory Valuation</h3>
        <p class="value">{{ stats.totalValue | currency:'INR':'symbol':'1.2-2' }}</p>
        <span class="trend">Live estimation</span>
      </div>
    </div>

    <div class="reports-section">
      <h3>Available Reports</h3>
      <div class="report-list">
        <div class="report-row">
          <div class="report-info">
            <strong>Stock Movement Summary</strong>
            <p>Monthly overview of all ins and outs</p>
          </div>
          <button class="btn btn-secondary" [disabled]="downloading.stockPdf" (click)="downloadStockMovementSummaryPdf()">
            {{ downloading.stockPdf ? 'Generating PDF...' : 'Generate PDF' }}
          </button>
        </div>
        <div class="report-row">
          <div class="report-info">
            <strong>Supplier Performance</strong>
            <p>Delivery times and order accuracy</p>
          </div>
          <button class="btn btn-secondary" [disabled]="downloading.supplierExcel" (click)="downloadSupplierPerformanceExcel()">
            {{ downloading.supplierExcel ? 'Generating Excel...' : 'Generate Excel' }}
          </button>
        </div>
        <div class="report-row">
          <div class="report-info">
            <strong>Financial Reconciliation</strong>
            <p>Matching invoices with payments</p>
          </div>
          <button class="btn btn-secondary" [disabled]="downloading.financialCsv" (click)="downloadFinancialReconciliationCsv()">
            {{ downloading.financialCsv ? 'Preparing CSV...' : 'Download CSV' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background: #171717; border: 1px solid var(--border); padding: 1.5rem; border-radius: 12px; }
    .stat-card h3 { font-size: 0.875rem; color: #a3a3a3; margin-bottom: 1rem; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: white; margin: 0; }
    .trend { font-size: 0.75rem; color: var(--primary); margin-top: 0.5rem; display: block; }
    .reports-section h3 { margin-bottom: 1.5rem; font-size: 1.125rem; }
    .report-list { background: #171717; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .report-row { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .report-row:last-child { border-bottom: none; }
    .report-info strong { display: block; color: #e5e5e5; font-size: 0.95rem; }
    .report-info p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #737373; }
    .report-row .btn[disabled] { opacity: 0.7; cursor: wait; }
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; }
      .header .btn { width: 100%; }
      .stats-grid { grid-template-columns: 1fr; }
      .report-row { flex-direction: column; align-items: stretch; gap: 1rem; }
      .report-row .btn { width: 100%; }
    }
  `]
})
export class ReportDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  downloading = {
    stockPdf: false,
    supplierExcel: false,
    financialCsv: false
  };

  constructor(
    private reportService: ReportService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.refreshStats();
  }

  refreshStats(): void {
    this.reportService.getDashboardStats().subscribe(data => {
      this.stats = data;
    });
  }

  downloadStockMovementSummaryPdf(): void {
    this.downloading.stockPdf = true;
    this.reportService.downloadStockMovementSummaryPdf()
      .pipe(finalize(() => this.downloading.stockPdf = false))
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'stock-movement-summary.pdf');
          this.toastService.success('Stock movement summary downloaded');
        },
        error: () => this.toastService.error('Failed to generate stock movement summary')
      });
  }

  downloadSupplierPerformanceExcel(): void {
    this.downloading.supplierExcel = true;
    this.reportService.downloadSupplierPerformanceExcel()
      .pipe(finalize(() => this.downloading.supplierExcel = false))
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'supplier-performance.xls');
          this.toastService.success('Supplier performance report downloaded');
        },
        error: () => this.toastService.error('Failed to generate supplier performance report')
      });
  }

  downloadFinancialReconciliationCsv(): void {
    this.downloading.financialCsv = true;
    this.reportService.downloadFinancialReconciliationCsv()
      .pipe(finalize(() => this.downloading.financialCsv = false))
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'financial-reconciliation.csv');
          this.toastService.success('Financial reconciliation report downloaded');
        },
        error: () => this.toastService.error('Failed to generate financial reconciliation report')
      });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
