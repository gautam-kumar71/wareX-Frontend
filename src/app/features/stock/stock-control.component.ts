import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Warehouse, WarehouseService } from '../../core/services/warehouse.service';
import { Product, ProductService } from '../../core/services/product.service';
import {
  AdjustStockPayload,
  AdjustmentReason,
  BulkThresholdUpdatePayload,
  InitializeStockPayload,
  StockLevel,
  StockQueryOptions,
  TransferStockPayload,
  StockService
} from '../../core/services/stock.service';
import { ToastService } from '../../core/services/toast.service';
import { ServiceUnavailableComponent } from '../../shared/components/service-unavailable/service-unavailable.component';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-stock-control',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ServiceUnavailableComponent, RouterLink],
  template: `
    <div class="header">
      <div>
        <h2>Stock Control</h2>
        <p class="subtitle">Initialize SKUs, tune reorder thresholds, and make governed quantity changes by warehouse</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline action-btn" (click)="refresh()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" />
          </svg>
          <span>Refresh</span>
        </button>
        <button *ngIf="canInitializeStock()" class="btn btn-primary action-btn" (click)="openInitializeModal()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Initialize Stock</span>
        </button>
      </div>
    </div>

    <div class="summary-grid" *ngIf="!serviceError">
      <div class="summary-card">
        <div class="summary-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
          </svg>
        </div>
        <span class="summary-label">Warehouses Tracked</span>
        <strong>{{ warehouses.length }}</strong>
      </div>
      <div class="summary-card">
        <div class="summary-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v9M12 18h.01M5 20h14L12 4 5 20Z" />
          </svg>
        </div>
        <span class="summary-label">Low Stock Rows</span>
        <strong>{{ lowStockItems.length }}</strong>
      </div>
      <div class="summary-card">
        <div class="summary-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 17h16M7 17V9h3v8M14 17V5h3v12" />
          </svg>
        </div>
        <span class="summary-label">Active Warehouse View</span>
        <strong>{{ currentWarehouseStock.length }}</strong>
      </div>
    </div>

    <ng-container *ngIf="!serviceError; else errorState">
      <div class="toolbar">
        <div class="toolbar-field">
          <label>Warehouse</label>
          <select [ngModel]="selectedWarehouseId" (ngModelChange)="onWarehouseChange($event)" class="form-control">
            <option *ngFor="let wh of warehouses" [ngValue]="wh.id">{{ wh.name }}</option>
          </select>
        </div>
        <div class="toolbar-field wide">
          <label>Filter</label>
          <input class="form-control" [(ngModel)]="searchQuery" (ngModelChange)="onStockFilterChange()" placeholder="Search product, SKU, or product ID">
        </div>
        <div class="toolbar-field">
          <label>Signal</label>
          <select [ngModel]="signalFilter" (ngModelChange)="signalFilter = $event; onStockFilterChange()" class="form-control">
            <option value="all">All stock</option>
            <option value="low">Low stock only</option>
            <option value="over">Over capacity only</option>
            <option value="attention">Low or over capacity</option>
          </select>
        </div>
        <div class="toolbar-field">
          <label>Sort</label>
          <select [ngModel]="sortBy" (ngModelChange)="sortBy = $event; onStockFilterChange()" class="form-control">
            <option value="updatedAt">Last updated</option>
            <option value="productName">Product name</option>
            <option value="availableQty">Available quantity</option>
            <option value="quantity">On hand quantity</option>
            <option value="reorderPoint">Reorder point</option>
            <option value="maxCapacity">Max capacity</option>
          </select>
        </div>
        <div class="toolbar-field">
          <label>Direction</label>
          <select [ngModel]="sortDir" (ngModelChange)="sortDir = $event; onStockFilterChange()" class="form-control">
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </div>
        <div class="toolbar-field">
          <label>Low-Stock Scope</label>
          <select [ngModel]="lowStockScope" (ngModelChange)="lowStockScope = $event; loadLowStock()" class="form-control">
            <option value="all">All warehouses</option>
            <option value="current">Current warehouse</option>
          </select>
        </div>
      </div>

      <div class="layout-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h3>Warehouse Stock</h3>
              <p>{{ selectedWarehouseName }}</p>
              <div class="role-hint">
                Threshold editing requires Inventory Manager or Admin.
              </div>
            </div>
            <div class="bulk-actions" *ngIf="currentWarehouseStock.length > 0">
              <button class="btn btn-outline btn-sm" (click)="toggleSelectAllVisible()">
                {{ areAllVisibleSelected ? 'Clear Visible' : 'Select Visible' }}
              </button>
              <button
                class="btn btn-outline btn-sm"
                (click)="openBulkThresholdModal()"
                [disabled]="selectedRows.length === 0 || !canManageThresholds()"
                [title]="thresholdPermissionHint()"
              >
                Bulk Thresholds
              </button>
              <button class="btn btn-primary btn-sm" (click)="openBulkTransferModal()" [disabled]="selectedRows.length === 0">Transfer Selected</button>
            </div>
          </div>

          <div class="selection-summary" *ngIf="selectedRows.length > 0">
            <strong>{{ selectedRows.length }} selected</strong>
            <span>{{ selectedQuantitySummary }}</span>
          </div>

          <div class="table-wrap desktop-stock-table">
            <table class="modern-table">
              <thead>
                <tr>
                  <th class="checkbox-col">
                    <input type="checkbox" [checked]="areAllVisibleSelected" (change)="toggleSelectAllVisible()">
                  </th>
                  <th>Product</th>
                  <th>On Hand</th>
                  <th>Available</th>
                  <th>Reorder</th>
                  <th>Max</th>
                  <th>Signals</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of currentWarehouseStock">
                  <td class="checkbox-col">
                    <input type="checkbox" [checked]="isSelected(item)" (change)="toggleRowSelection(item)">
                  </td>
                  <td>
                    <strong>{{ item.productName || ('Product #' + item.productId) }}</strong>
                    <div class="text-muted">{{ item.sku || ('ID ' + item.productId) }}</div>
                  </td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.availableQty }}</td>
                  <td>{{ item.reorderPoint }}</td>
                  <td>{{ item.maxCapacity ?? 'Not set' }}</td>
                  <td>
                    <div class="signal-stack">
                      <span class="signal-chip signal-low" *ngIf="item.lowStock">Low stock</span>
                      <span class="signal-chip signal-over" *ngIf="item.overstock">{{ stockCapacityLabel(item) }}</span>
                      <span class="signal-chip signal-info" *ngIf="hasReservedPressure(item)">{{ reservedSignalLabel(item) }}</span>
                      <span class="signal-chip signal-info" *ngIf="isWarehouseCapacityTight(item)">Warehouse tight</span>
                      <span class="text-muted" *ngIf="showNormalSignal(item)">Normal</span>
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="row-actions">
                      <button class="btn btn-outline btn-sm" (click)="openAdjustModal(item, 'movement')">Adjust Qty</button>
                      <button
                        class="btn btn-outline btn-sm"
                        (click)="openAdjustModal(item, 'threshold')"
                        [disabled]="!canManageThresholds()"
                        [title]="thresholdPermissionHint()"
                      >
                        Edit Thresholds
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="currentWarehouseStock.length === 0 && !loading">
                  <td colspan="8" class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p>No stock rows match the current warehouse or filter.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="stock-stack mobile-stock-stack" *ngIf="currentWarehouseStock.length > 0">
            <article class="stock-card" *ngFor="let item of currentWarehouseStock">
              <div class="stock-card-head">
                <label class="select-chip">
                  <input type="checkbox" [checked]="isSelected(item)" (change)="toggleRowSelection(item)">
                  <span>Select</span>
                </label>
                <div class="row-actions">
                  <button class="btn btn-outline btn-sm" (click)="openAdjustModal(item, 'movement')">Adjust Qty</button>
                  <button
                    class="btn btn-outline btn-sm"
                    (click)="openAdjustModal(item, 'threshold')"
                    [disabled]="!canManageThresholds()"
                    [title]="thresholdPermissionHint()"
                  >
                    Thresholds
                  </button>
                </div>
              </div>

              <div class="stock-title">
                <strong>{{ item.productName || ('Product #' + item.productId) }}</strong>
                <div class="text-muted">{{ item.sku || ('ID ' + item.productId) }}</div>
              </div>

              <div class="stock-card-grid">
                <div class="stock-field">
                  <span class="field-label">On Hand</span>
                  <strong>{{ item.quantity }}</strong>
                </div>
                <div class="stock-field">
                  <span class="field-label">Available</span>
                  <strong>{{ item.availableQty }}</strong>
                </div>
                <div class="stock-field">
                  <span class="field-label">Reorder</span>
                  <strong>{{ item.reorderPoint }}</strong>
                </div>
                <div class="stock-field">
                  <span class="field-label">Max</span>
                  <strong>{{ item.maxCapacity ?? 'Not set' }}</strong>
                </div>
              </div>

              <div class="signal-stack">
                <span class="signal-chip signal-low" *ngIf="item.lowStock">Low stock</span>
                <span class="signal-chip signal-over" *ngIf="item.overstock">{{ stockCapacityLabel(item) }}</span>
                <span class="signal-chip signal-info" *ngIf="hasReservedPressure(item)">{{ reservedSignalLabel(item) }}</span>
                <span class="signal-chip signal-info" *ngIf="isWarehouseCapacityTight(item)">Warehouse tight</span>
                <span class="signal-chip signal-normal" *ngIf="showNormalSignal(item)">Normal</span>
              </div>
            </article>
          </div>

          <div class="mobile-empty-state mobile-stock-stack" *ngIf="currentWarehouseStock.length === 0 && !loading">
            <div class="empty-icon">[ ]</div>
            <p>No stock rows match the current warehouse or filter.</p>
          </div>
        </section>

        <section class="panel side-panel">
          <div class="panel-head">
            <div>
              <h3>Low Stock Queue</h3>
              <p>Rows already at or below reorder point</p>
            </div>
          </div>

          <button class="queue-item" *ngFor="let item of lowStockItems" (click)="jumpToStock(item)">
            <div>
              <strong>{{ item.productName || ('Product #' + item.productId) }}</strong>
              <div class="text-muted">{{ item.warehouseName }} • {{ item.sku || ('ID ' + item.productId) }}</div>
            </div>
            <div class="queue-metrics">
              <span>{{ item.availableQty }} free</span>
              <span>ROP {{ item.reorderPoint }}</span>
            </div>
          </button>

          <div class="empty-hint" *ngIf="lowStockItems.length === 0 && !loading">
            No low-stock items right now.
          </div>
        </section>
      </div>
    </ng-container>

    <div class="modal-backdrop" *ngIf="initializeModalOpen" (click)="closeInitializeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>Initialize Stock</h3>
            <p>Create the first stock row for a product/warehouse pair</p>
          </div>
          <button class="icon-btn" (click)="closeInitializeModal()">×</button>
        </div>

        <form [formGroup]="initializeForm" (ngSubmit)="submitInitialize()">
          <label>Warehouse</label>
          <select formControlName="warehouseId" class="form-control">
            <option [ngValue]="null">Select warehouse</option>
            <option *ngFor="let wh of warehouses" [ngValue]="wh.id">{{ wh.name }}</option>
          </select>

          <label>Product</label>
          <input
            type="text"
            class="form-control"
            [ngModel]="productSearchQuery"
            (ngModelChange)="productSearchQuery = $event; onProductSearchInput()"
            [ngModelOptions]="{ standalone: true }"
            placeholder="Search by product name, SKU, category, or description"
          >

          <div class="selection-card selected-product" *ngIf="selectedProduct">
            <strong>{{ selectedProduct.name }}</strong>
            <div class="text-muted">{{ selectedProduct.sku }}<span *ngIf="selectedProduct.category"> • {{ selectedProduct.category }}</span></div>
          </div>

          <div class="product-picker">
            <button
              type="button"
              class="product-option"
              *ngFor="let product of productSearchResults"
              [class.selected]="product.id === initializeForm.value.productId"
              (click)="selectProduct(product)"
            >
              <div>
                <strong>{{ product.name }}</strong>
                <div class="text-muted">{{ product.sku }}<span *ngIf="product.category"> • {{ product.category }}</span></div>
              </div>
              <span class="product-meta">{{ productSignal(product) }}</span>
            </button>

            <div class="empty-hint" *ngIf="productSearchLoading">Loading products...</div>
            <div class="empty-hint" *ngIf="!productSearchLoading && productSearchResults.length === 0">
              No products matched this search.
            </div>
          </div>

          <div class="empty-hint" *ngIf="!productSearchLoading && !selectedProduct">
            Select a product from the list before initializing stock.
          </div>

          <div class="picker-footer">
            <span class="text-muted">Showing {{ productSearchResults.length }} of {{ productSearchTotalElements }} matching products</span>
            <div class="pager">
              <button type="button" class="btn btn-outline btn-sm" (click)="previousProductPage()" [disabled]="productSearchPage === 0 || productSearchLoading">Prev</button>
              <span class="text-muted">Page {{ productSearchTotalPages === 0 ? 0 : productSearchPage + 1 }} / {{ productSearchTotalPages || 0 }}</span>
              <button type="button" class="btn btn-outline btn-sm" (click)="nextProductPage()" [disabled]="productSearchPage + 1 >= productSearchTotalPages || productSearchLoading">Next</button>
            </div>
          </div>

          <div class="form-grid">
            <div>
              <label>Initial Quantity</label>
              <input type="number" class="form-control" formControlName="initialQty" min="0">
            </div>
            <div>
              <label>Reorder Point</label>
              <input type="number" class="form-control" formControlName="reorderPoint" min="0">
            </div>
          </div>

          <label>Max Capacity</label>
          <input type="number" class="form-control" formControlName="maxCapacity" min="0" placeholder="Optional per-SKU capacity cap">

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeInitializeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="initializeForm.invalid || submitting || !selectedProduct">
              {{ submitting ? 'Saving...' : 'Initialize Stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="adjustModalOpen" (click)="closeAdjustModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>{{ adjustModalTitle() }}</h3>
            <p>{{ selectedStock?.productName || ('Product #' + selectedStock?.productId) }} • {{ selectedStock?.warehouseName }}</p>
          </div>
          <button class="icon-btn" (click)="closeAdjustModal()">×</button>
        </div>

        <form [formGroup]="adjustForm" (ngSubmit)="submitAdjustment()">
          <ng-container *ngIf="adjustmentMode === 'movement'; else thresholdEditLayout">
            <div class="selection-card" *ngIf="selectedStock">
              <strong>Current On Hand: {{ selectedStock.quantity }}</strong>
              <div class="text-muted">Available {{ selectedStock.availableQty }} • Reserved {{ selectedStock.reservedQty }}</div>
            </div>

            <div class="selection-card action-mode-card action-mode-movement" *ngIf="selectedStock">
              <strong>{{ adjustmentModeLabel() }}</strong>
              <div class="text-muted">{{ adjustmentModeHint() }}</div>
            </div>

            <label>Quantity Delta</label>
            <input type="number" class="form-control" formControlName="quantityDelta" placeholder="Use positive to add, negative to remove">
            <div class="field-hint">
              Use a positive number to add stock or a negative number to remove it. Threshold settings can still be updated in the same save if needed.
            </div>

            <label>Adjustment Reason</label>
            <select class="form-control" formControlName="reason">
              <option *ngFor="let reason of adjustmentReasons" [value]="reason">{{ formatReason(reason) }}</option>
            </select>

            <label>Notes</label>
            <input type="text" class="form-control" formControlName="notes" placeholder="Optional audit note">

            <ng-container *ngIf="canManageThresholds(); else movementThresholdReadOnly">
              <div class="form-grid">
                <div>
                  <label>Reorder Point</label>
                  <input type="number" class="form-control" formControlName="reorderPoint" min="0">
                </div>
                <div>
                  <label>Max Capacity</label>
                  <input type="number" class="form-control" formControlName="maxCapacity" min="0">
                </div>
              </div>
            </ng-container>

            <ng-template #movementThresholdReadOnly>
              <div class="selection-card threshold-readonly">
                <strong>Threshold settings are read-only for your role</strong>
                <div class="text-muted">{{ thresholdPermissionHint() }}</div>
                <div class="threshold-grid compact-threshold-grid" *ngIf="selectedStock">
                  <div class="selection-card metric-card">
                    <span class="field-label">Current Reorder</span>
                    <strong>{{ selectedStock.reorderPoint }}</strong>
                  </div>
                  <div class="selection-card metric-card">
                    <span class="field-label">Current Max</span>
                    <strong>{{ selectedStock.maxCapacity ?? 'Not set' }}</strong>
                  </div>
                </div>
              </div>
            </ng-template>

            <div class="selection-card" *ngIf="selectedStock">
              <strong>Warehouse free space: {{ getWarehouseRemainingCapacity(selectedStock.warehouseId) ?? 'Unlimited' }}</strong>
              <div class="text-muted">
                {{ warehouseCapacityHelperText(selectedStock.warehouseId) }}
              </div>
            </div>

            <div
              class="selection-card action-preview"
              *ngIf="selectedStock"
              [class.action-preview-danger]="adjustmentPreviewTone() === 'danger'"
              [class.action-preview-warning]="adjustmentPreviewTone() === 'warning'"
              [class.action-preview-success]="adjustmentPreviewTone() === 'success'"
            >
              <strong>{{ adjustmentPreviewTitle() }}</strong>
              <div class="text-muted">{{ adjustmentPreviewMessage() }}</div>
            </div>
          </ng-container>

          <ng-template #thresholdEditLayout>
            <div class="selection-card threshold-summary" *ngIf="selectedStock">
              <strong>Threshold-only edit</strong>
              <div class="text-muted">On-hand stays at {{ selectedStock.quantity }}. Use this form to change reorder behavior and reset item capacity limits.</div>
            </div>

            <div class="threshold-grid">
              <div class="selection-card metric-card" *ngIf="selectedStock">
                <span class="field-label">Current Reorder</span>
                <strong>{{ selectedStock.reorderPoint }}</strong>
              </div>
              <div class="selection-card metric-card" *ngIf="selectedStock">
                <span class="field-label">Current Max</span>
                <strong>{{ selectedStock.maxCapacity ?? 'Not set' }}</strong>
              </div>
            </div>

            <div class="form-grid">
              <div>
                <label>Reorder Point</label>
                <input type="number" class="form-control" formControlName="reorderPoint" min="0">
              </div>
              <div>
                <label>Max Capacity</label>
                <input type="number" class="form-control" formControlName="maxCapacity" min="0" placeholder="Leave blank to remove the item cap">
              </div>
            </div>

            <div class="selection-card" *ngIf="selectedStock">
              <strong>Warehouse free space: {{ getWarehouseRemainingCapacity(selectedStock.warehouseId) ?? 'Unlimited' }}</strong>
              <div class="text-muted">
                {{ warehouseCapacityHelperText(selectedStock.warehouseId) }}
              </div>
            </div>

            <div class="selection-card action-preview action-preview-success" *ngIf="selectedStock">
              <strong>{{ thresholdPreviewTitle() }}</strong>
              <div class="text-muted">{{ thresholdPreviewMessage() }}</div>
            </div>
          </ng-template>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeAdjustModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="!canSubmitAdjustment()">
              {{ submitting ? 'Applying...' : adjustmentActionLabel() }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="bulkThresholdModalOpen" (click)="closeBulkThresholdModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>Bulk Threshold Update</h3>
            <p>Apply new reorder and capacity settings to the selected stock rows</p>
          </div>
          <button class="icon-btn" (click)="closeBulkThresholdModal()">×</button>
        </div>

        <form [formGroup]="bulkThresholdForm" (ngSubmit)="submitBulkThresholdUpdate()">
          <div class="selection-card">
            <strong>{{ selectedRows.length }} rows selected</strong>
            <div class="text-muted">{{ selectedRowNames }}</div>
          </div>

          <div class="form-grid">
            <div>
              <label>Reorder Point</label>
              <input type="number" class="form-control" formControlName="reorderPoint" min="0" placeholder="Leave blank to keep current">
            </div>
            <div>
              <label>Max Capacity</label>
              <input type="number" class="form-control" formControlName="maxCapacity" min="0" placeholder="Leave blank to keep current">
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeBulkThresholdModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="submitting">
              {{ submitting ? 'Updating...' : 'Apply Thresholds' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="bulkTransferModalOpen" (click)="closeBulkTransferModal()">
      <div class="modal-card modal-card-wide" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>Transfer Selected Stock</h3>
            <p>Move selected SKUs to another active warehouse with per-line quantity control</p>
          </div>
          <button class="icon-btn" (click)="closeBulkTransferModal()">×</button>
        </div>

        <div class="form-grid">
          <div>
            <label>Destination Warehouse</label>
            <select class="form-control" [(ngModel)]="bulkTransferDestinationId" [ngModelOptions]="{ standalone: true }">
              <option [ngValue]="undefined">Select destination</option>
              <option *ngFor="let wh of transferDestinationOptions" [ngValue]="wh.id">{{ wh.name }}</option>
            </select>
          </div>
          <div>
            <label>Reference</label>
            <input type="text" class="form-control" [(ngModel)]="bulkTransferReference" [ngModelOptions]="{ standalone: true }" placeholder="Optional transfer batch or ticket ID">
          </div>
        </div>

        <div class="bulk-transfer-list">
          <div class="bulk-transfer-row" *ngFor="let item of selectedRows">
            <div>
              <strong>{{ item.productName || ('Product #' + item.productId) }}</strong>
              <div class="text-muted">{{ item.sku || ('ID ' + item.productId) }} • {{ item.availableQty }} available</div>
            </div>
              <input
              type="number"
              class="form-control compact-control"
              [ngModel]="bulkTransferQuantities[item.id]"
              (ngModelChange)="bulkTransferQuantities[item.id] = $event"
              [ngModelOptions]="{ standalone: true }"
              min="1"
              [max]="item.availableQty"
            >
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" (click)="closeBulkTransferModal()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="submitBulkTransfer()" [disabled]="submitting || selectedRows.length === 0">
            {{ submitting ? 'Transferring...' : 'Transfer Selected' }}
          </button>
        </div>
      </div>
    </div>

    <ng-template #errorState>
      <app-service-unavailable serviceName="Warehouse Service" (retry)="refresh()"></app-service-unavailable>
    </ng-template>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
    .header h2 { font-size: 1.6rem; font-weight: 900; color: white; margin: 0 0 0.25rem; }
    .subtitle { color: var(--text-muted); font-size: 0.95rem; margin: 0; }
    .header-actions { display: flex; gap: 0.75rem; }
    .action-btn { gap: 0.55rem; }
    .action-btn svg,
    .summary-icon svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { background: #111; border: 1px solid var(--border); border-radius: 16px; padding: 1rem 1.25rem; }
    .summary-icon { width: 2.2rem; height: 2.2rem; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; background: rgba(74, 124, 68, 0.14); color: #9bd38e; }
    .summary-label { display: block; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.45rem; }
    .summary-card strong { font-size: 1.4rem; color: white; }
    .toolbar { display: grid; grid-template-columns: 220px minmax(0, 1.4fr) repeat(4, minmax(0, 0.8fr)); gap: 1rem; margin-bottom: 1rem; }
    .toolbar-field label { display: block; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem; }
    .toolbar-field.wide { width: 100%; }
    .layout-grid { display: grid; grid-template-columns: minmax(0, 1.95fr) minmax(320px, 0.8fr); gap: 1rem; align-items: start; }
    .panel { background: #111; border: 1px solid var(--border); border-radius: 18px; padding: 1rem; min-width: 0; }
    .panel-head { display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; gap: 0.85rem; margin-bottom: 0.85rem; }
    .panel-head h3 { margin: 0; font-size: 1rem; color: white; }
    .panel-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
    .role-hint { margin-top: 0.45rem; color: #93c5fd; font-size: 0.76rem; font-weight: 600; }
    .bulk-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; justify-content: flex-start; width: 100%; }
    .bulk-actions .btn { flex: 1 1 180px; }
    .selection-summary { display: flex; justify-content: space-between; gap: 1rem; align-items: center; background: #0f0f0f; border: 1px solid var(--border); border-radius: 12px; padding: 0.75rem 0.9rem; margin-bottom: 0.85rem; color: var(--text-muted); font-size: 0.84rem; }
    .side-panel { max-height: none; overflow: visible; min-width: 320px; align-self: start; }
    .table-wrap { overflow-x: hidden; overflow-y: hidden; min-width: 0; }
    .desktop-stock-table { display: block; }
    .mobile-stock-stack { display: none; }
    .checkbox-col { width: 44px; text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: var(--text-muted); font-size: 0.8rem; }
    .table-wrap .modern-table { min-width: 0; width: 100%; table-layout: fixed; }
    .table-wrap .modern-table th,
    .table-wrap .modern-table td { overflow: hidden; vertical-align: middle; }
    .table-wrap .modern-table th { white-space: nowrap; }
    .table-wrap .modern-table td { white-space: normal; }
    .table-wrap .modern-table th:nth-child(1),
    .table-wrap .modern-table td:nth-child(1) { width: 5%; }
    .table-wrap .modern-table th:nth-child(2),
    .table-wrap .modern-table td:nth-child(2) { width: 20%; }
    .table-wrap .modern-table th:nth-child(3),
    .table-wrap .modern-table td:nth-child(3) { width: 10%; }
    .table-wrap .modern-table th:nth-child(4),
    .table-wrap .modern-table td:nth-child(4) { width: 12%; }
    .table-wrap .modern-table th:nth-child(5),
    .table-wrap .modern-table td:nth-child(5) { width: 10%; }
    .table-wrap .modern-table th:nth-child(6),
    .table-wrap .modern-table td:nth-child(6) { width: 8%; }
    .table-wrap .modern-table th:nth-child(7),
    .table-wrap .modern-table td:nth-child(7) { width: 14%; }
    .table-wrap .modern-table th:nth-child(8),
    .table-wrap .modern-table td:nth-child(8) { width: 21%; }
    .table-wrap .modern-table td:nth-child(2) strong,
    .table-wrap .modern-table td:nth-child(2) .text-muted { overflow-wrap: anywhere; word-break: break-word; }
    .signal-stack { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .signal-chip { display: inline-flex; align-items: center; padding: 0.3rem 0.55rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; }
    .signal-low { background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; }
    .signal-over { background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; }
    .signal-info { background: rgba(96, 165, 250, 0.14); border: 1px solid rgba(96, 165, 250, 0.24); color: #93c5fd; }
    .signal-normal { background: rgba(74, 124, 68, 0.14); border: 1px solid rgba(74, 124, 68, 0.24); color: #9bd38e; }
    .stock-stack { gap: 0.85rem; }
    .stock-card { background: #0f0f0f; border: 1px solid var(--border); border-radius: 14px; padding: 0.95rem; }
    .stock-card-head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; margin-bottom: 0.85rem; }
    .select-chip { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; }
    .stock-title { margin-bottom: 0.85rem; }
    .stock-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem; }
    .stock-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .field-label { color: var(--text-muted); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .mobile-empty-state { text-align: center; padding: 2rem 1.1rem; background: #0f0f0f; border: 1px solid var(--border); border-radius: 14px; color: var(--text-muted); }
    .queue-item { width: 100%; background: #0f0f0f; color: white; border: 1px solid var(--border); border-radius: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 0.85rem; text-align: left; margin-bottom: 0.65rem; cursor: pointer; min-width: 0; }
    .row-actions { display: inline-flex; flex-direction: column; gap: 0.45rem; flex-wrap: nowrap; justify-content: flex-end; align-items: stretch; width: 100%; max-width: 100%; }
    .row-actions .btn { width: 100%; padding: 0.62rem 0.7rem; white-space: nowrap; font-size: 0.82rem; line-height: 1.15; }
    .queue-item > div:first-child { min-width: 0; }
    .queue-item strong,
    .queue-item .text-muted { overflow-wrap: anywhere; }
    .queue-metrics { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; color: var(--text-muted); font-size: 0.8rem; flex: 0 0 auto; }
    .empty-state { text-align: center; padding: 4rem 2rem !important; color: var(--text-muted); }
    .empty-icon { font-size: 2.4rem; margin-bottom: 1rem; opacity: 0.15; }
    .empty-hint { color: var(--text-muted); font-size: 0.85rem; padding: 0.75rem 0; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 1.5rem; z-index: 50; }
    .modal-card { width: min(620px, 100%); max-height: calc(100vh - 3rem); overflow: auto; background: #101010; border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; box-shadow: 0 30px 80px rgba(0,0,0,0.45); }
    .modal-card-wide { width: min(820px, 100%); max-height: calc(100vh - 3rem); overflow: auto; }
    .modal-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .modal-header h3 { margin: 0; font-size: 1.2rem; }
    .modal-header p { margin: 0.35rem 0 0; color: var(--text-muted); }
    .icon-btn { width: 2rem; height: 2rem; border-radius: 999px; border: 1px solid var(--border); background: #171717; color: white; cursor: pointer; }
    .form-control { width: 100%; background: #0a0a0a; border: 1px solid var(--border); color: white; border-radius: 10px; padding: 0.75rem; margin: 0.35rem 0 0.85rem; }
    .field-hint { margin: -0.35rem 0 0.85rem; color: var(--text-muted); font-size: 0.78rem; line-height: 1.45; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .selection-card { background: #0f0f0f; border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; margin-bottom: 0.85rem; }
    .action-mode-card { margin-top: 0.25rem; }
    .action-mode-threshold { border-color: rgba(96, 165, 250, 0.35); box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.12) inset; }
    .action-mode-movement { border-color: rgba(134, 239, 172, 0.35); box-shadow: 0 0 0 1px rgba(134, 239, 172, 0.12) inset; }
    .threshold-summary { margin-bottom: 1rem; }
    .threshold-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.15rem; }
    .compact-threshold-grid { margin-top: 0.85rem; margin-bottom: 0; }
    .threshold-readonly { border-color: rgba(96, 165, 250, 0.2); }
    .metric-card { margin-bottom: 0; }
    .metric-card strong { display: block; margin-top: 0.35rem; font-size: 1.2rem; color: white; }
    .action-preview { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .action-preview-danger { border-color: rgba(239, 68, 68, 0.35); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.12) inset; }
    .action-preview-warning { border-color: rgba(245, 158, 11, 0.35); box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.12) inset; }
    .action-preview-success { border-color: rgba(134, 239, 172, 0.35); box-shadow: 0 0 0 1px rgba(134, 239, 172, 0.12) inset; }
    .selected-product { margin-top: 0.15rem; }
    .product-picker { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 0.85rem; max-height: 280px; overflow: auto; }
    .product-option { width: 100%; background: #0f0f0f; color: white; border: 1px solid var(--border); border-radius: 12px; display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.85rem; text-align: left; cursor: pointer; }
    .product-option.selected { border-color: rgba(134, 239, 172, 0.55); box-shadow: 0 0 0 1px rgba(134, 239, 172, 0.2) inset; }
    .product-meta { color: var(--text-muted); font-size: 0.78rem; }
    .picker-footer { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 0.9rem; }
    .pager { display: flex; align-items: center; gap: 0.75rem; }
    .bulk-transfer-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 360px; overflow: auto; margin-top: 0.5rem; }
    .bulk-transfer-row { display: grid; grid-template-columns: minmax(0, 1fr) 140px; gap: 1rem; align-items: center; background: #0f0f0f; border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem; }
    .compact-control { margin-bottom: 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
    @media (max-width: 1440px) {
      .layout-grid { grid-template-columns: 1fr; }
      .side-panel { max-height: none; min-width: 0; overflow: visible; }
    }
    @media (max-width: 960px) {
      .summary-grid, .toolbar, .layout-grid, .form-grid { grid-template-columns: 1fr; }
      .header { flex-direction: column; }
      .header-actions { width: 100%; }
      .header-actions .btn { flex: 1 1 0; }
      .picker-footer { flex-direction: column; align-items: flex-start; }
      .selection-summary, .bulk-transfer-row { grid-template-columns: 1fr; }
      .side-panel { max-height: none; overflow: visible; }
    }
    @media (max-width: 768px) {
      .desktop-stock-table { display: none; }
      .mobile-stock-stack { display: block; }
      .stock-stack.mobile-stock-stack { display: grid; }
      .summary-card strong { font-size: 1.25rem; }
      .toolbar { gap: 0.85rem; }
      .panel { padding: 0.85rem; }
      .panel-head { flex-direction: column; gap: 0.85rem; }
      .bulk-actions { width: 100%; justify-content: stretch; }
      .bulk-actions .btn { width: 100%; }
      .selection-summary { flex-direction: column; align-items: flex-start; }
      .queue-item { flex-direction: column; align-items: flex-start; }
      .queue-metrics { align-items: flex-start; }
      .stock-card-grid { grid-template-columns: 1fr 1fr; }
      .modal-card, .modal-card-wide { padding: 1rem; border-radius: 16px; }
      .modal-actions { flex-direction: column-reverse; }
      .modal-actions .btn { width: 100%; }
    }
    @media (max-width: 480px) {
      .header-actions { flex-direction: column; }
      .header-actions .btn { width: 100%; }
      .stock-card-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StockControlComponent implements OnInit {
  warehouses: Warehouse[] = [];
  lowStockItems: StockLevel[] = [];
  currentWarehouseStock: StockLevel[] = [];
  productSearchResults: Product[] = [];
  selectedWarehouseId?: number;
  searchQuery = '';
  signalFilter: 'all' | 'low' | 'over' | 'attention' = 'all';
  sortBy: StockQueryOptions['sortBy'] = 'updatedAt';
  sortDir: NonNullable<StockQueryOptions['sortDir']> = 'desc';
  lowStockScope: 'all' | 'current' = 'all';
  productSearchQuery = '';
  productSearchPage = 0;
  readonly productSearchSize = 8;
  productSearchTotalPages = 0;
  productSearchTotalElements = 0;
  productSearchLoading = false;
  loading = false;
  submitting = false;
  serviceError = false;
  initializeModalOpen = false;
  adjustModalOpen = false;
  bulkThresholdModalOpen = false;
  bulkTransferModalOpen = false;
  adjustmentMode: 'movement' | 'threshold' = 'movement';
  selectedStock?: StockLevel;
  selectedProduct?: Product;
  selectedStockIds = new Set<number>();
  bulkTransferDestinationId?: number;
  bulkTransferReference = '';
  bulkTransferQuantities: Record<number, number> = {};
  private productSearchDebounce?: ReturnType<typeof setTimeout>;
  private stockFilterDebounce?: ReturnType<typeof setTimeout>;

  initializeForm: FormGroup;
  adjustForm: FormGroup;
  bulkThresholdForm: FormGroup;

  readonly adjustmentReasons: AdjustmentReason[] = [
    'CYCLE_COUNT',
    'DAMAGED_GOODS',
    'EXPIRED',
    'THEFT',
    'FOUND_STOCK',
    'SUPPLIER_RETURN',
    'QUALITY_REJECTION',
    'DATA_CORRECTION',
    'OTHER'
  ];

  constructor(
    private warehouseService: WarehouseService,
    private productService: ProductService,
    private stockService: StockService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.initializeForm = this.fb.group({
      warehouseId: [null, Validators.required],
      productId: [null, Validators.required],
      initialQty: [0, [Validators.required, Validators.min(0)]],
      reorderPoint: [0, [Validators.required, Validators.min(0)]],
      maxCapacity: [null]
    });

    this.adjustForm = this.fb.group({
      quantityDelta: [0, Validators.required],
      reason: ['DATA_CORRECTION', Validators.required],
      notes: [''],
      reorderPoint: [0, [Validators.required, Validators.min(0)]],
      maxCapacity: [null]
    });

    this.bulkThresholdForm = this.fb.group({
      reorderPoint: [null],
      maxCapacity: [null]
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  canInitializeStock(): boolean {
    return this.authService.canInitializeStock();
  }

  canManageThresholds(): boolean {
    return this.authService.canManageThresholds();
  }

  thresholdPermissionHint(): string {
    return this.canManageThresholds()
      ? 'You can edit reorder points and max capacities with your current role.'
      : 'Threshold editing requires Inventory Manager or Admin.';
  }

  refresh(): void {
    this.loading = true;
    this.serviceError = false;

    this.warehouseService.getWarehouses(true).subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
        this.selectedWarehouseId = this.selectedWarehouseId ?? warehouses[0]?.id;
        if (!this.selectedWarehouseId && warehouses.length > 0) {
          this.selectedWarehouseId = warehouses[0].id;
        }
        this.loadSelectedWarehouseStock();
        this.loadLowStock();
      },
      error: (err) => {
        this.handleServiceError(err, true);
      }
    });
  }

  loadSelectedWarehouseStock(markServiceUnavailable: boolean = true): void {
    if (!this.selectedWarehouseId) {
      this.currentWarehouseStock = [];
      this.loading = false;
      return;
    }

    this.stockService.getStockByWarehouse(this.selectedWarehouseId, this.buildStockQueryOptions(true)).subscribe({
      next: (stock) => {
        this.applyStockSearch(stock, filtered => {
          this.currentWarehouseStock = filtered;
          this.retainVisibleSelections();
          this.loading = false;
        });
      },
      error: (err) => this.handleServiceError(err, markServiceUnavailable)
    });
  }

  loadLowStock(): void {
    this.stockService.getLowStock({
      warehouseId: this.lowStockScope === 'current' ? this.selectedWarehouseId : undefined,
      query: this.searchQuery,
      sortBy: 'availableQty',
      sortDir: 'asc'
    }).subscribe({
      next: (stock) => {
        this.applyStockSearch(stock, filtered => {
          this.lowStockItems = filtered;
        });
      },
      error: () => {
        this.lowStockItems = [];
      }
    });
  }

  onWarehouseChange(warehouseId: number): void {
    this.selectedWarehouseId = warehouseId;
    this.loadSelectedWarehouseStock(true);
    this.loadLowStock();
  }

  onStockFilterChange(): void {
    if (this.stockFilterDebounce) {
      clearTimeout(this.stockFilterDebounce);
    }
    this.stockFilterDebounce = setTimeout(() => {
      this.loadSelectedWarehouseStock(false);
      this.loadLowStock();
    }, 220);
  }

  toggleRowSelection(item: StockLevel): void {
    if (this.selectedStockIds.has(item.id)) {
      this.selectedStockIds.delete(item.id);
      return;
    }
    this.selectedStockIds.add(item.id);
  }

  toggleSelectAllVisible(): void {
    if (this.areAllVisibleSelected) {
      this.currentWarehouseStock.forEach(item => this.selectedStockIds.delete(item.id));
      return;
    }
    this.currentWarehouseStock.forEach(item => this.selectedStockIds.add(item.id));
  }

  isSelected(item: StockLevel): boolean {
    return this.selectedStockIds.has(item.id);
  }

  openBulkThresholdModal(): void {
    if (!this.canManageThresholds()) {
      this.toastService.warning('Only admins and inventory managers can update reorder points or max capacities.');
      return;
    }

    if (this.selectedRows.length === 0) {
      return;
    }
    this.bulkThresholdModalOpen = true;
    this.bulkThresholdForm.reset({
      reorderPoint: null,
      maxCapacity: null
    });
  }

  closeBulkThresholdModal(): void {
    this.bulkThresholdModalOpen = false;
  }

  submitBulkThresholdUpdate(): void {
    if (!this.canManageThresholds()) {
      this.toastService.warning('Only admins and inventory managers can update reorder points or max capacities.');
      this.closeBulkThresholdModal();
      return;
    }

    const reorderPoint = this.bulkThresholdForm.value.reorderPoint;
    const maxCapacity = this.bulkThresholdForm.value.maxCapacity;
    if (reorderPoint === null && maxCapacity === null) {
      this.toastService.error('Set at least one threshold before applying the bulk update');
      return;
    }
    if (!this.isThresholdConfigurationValid(reorderPoint, maxCapacity)) {
      return;
    }

    const payload: BulkThresholdUpdatePayload = {
      productIds: this.selectedRows.map(item => item.productId),
      reorderPoint,
      maxCapacity
    };

    this.submitting = true;
    this.stockService.updateBulkThresholds(this.selectedWarehouseId!, payload).subscribe({
      next: (updated) => {
        this.toastService.success(`Updated thresholds for ${updated.length} stock rows`);
        this.submitting = false;
        this.closeBulkThresholdModal();
        this.refresh();
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  openBulkTransferModal(): void {
    if (this.selectedRows.length === 0) {
      return;
    }
    this.bulkTransferModalOpen = true;
    this.bulkTransferDestinationId = this.transferDestinationOptions[0]?.id;
    this.bulkTransferReference = '';
    this.bulkTransferQuantities = {};
    this.selectedRows.forEach(item => {
      this.bulkTransferQuantities[item.id] = this.defaultTransferQuantity(item);
    });
  }

  closeBulkTransferModal(): void {
    this.bulkTransferModalOpen = false;
  }

  submitBulkTransfer(): void {
    if (!this.selectedWarehouseId || !this.bulkTransferDestinationId) {
      this.toastService.error('Choose a destination warehouse before transferring');
      return;
    }

    const requests: TransferStockPayload[] = [];
    let totalRequestedForDestination = 0;
    for (const item of this.selectedRows) {
      const quantity = Number(this.bulkTransferQuantities[item.id] ?? this.defaultTransferQuantity(item));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }
      if (quantity > item.availableQty) {
        this.toastService.error(`Transfer quantity for ${item.productName || 'product ' + item.productId} exceeds available stock`);
        return;
      }
      totalRequestedForDestination += quantity;
      requests.push({
        productId: item.productId,
        sourceWarehouseId: this.selectedWarehouseId,
        destinationWarehouseId: this.bulkTransferDestinationId,
        quantity,
        referenceId: this.bulkTransferReference || undefined
      });
    }

    if (requests.length === 0) {
      this.toastService.error('Enter at least one valid transfer quantity');
      return;
    }

    this.submitting = true;
    forkJoin(requests.map(request => this.stockService.transferStock(request))).subscribe({
      next: () => {
        this.toastService.success(`Transferred ${requests.length} stock rows successfully`);
        this.submitting = false;
        this.selectedStockIds.clear();
        this.closeBulkTransferModal();
        this.refresh();
      },
      error: (err) => {
        this.toastService.error(this.extractStockActionError(err, 'Failed to transfer selected stock'), 7000);
        this.submitting = false;
      }
    });
  }

  openInitializeModal(): void {
    this.initializeModalOpen = true;
    this.selectedProduct = undefined;
    this.productSearchQuery = '';
    this.productSearchPage = 0;
    this.productSearchResults = [];
    this.productSearchTotalPages = 0;
    this.productSearchTotalElements = 0;
    this.initializeForm.reset({
      warehouseId: this.selectedWarehouseId ?? null,
      productId: null,
      initialQty: 0,
      reorderPoint: 0,
      maxCapacity: null
    });
    this.loadProductSearchResults();
  }

  closeInitializeModal(): void {
    this.initializeModalOpen = false;
    this.selectedProduct = undefined;
    if (this.productSearchDebounce) {
      clearTimeout(this.productSearchDebounce);
    }
  }

  onProductSearchInput(): void {
    this.selectedProduct = undefined;
    this.initializeForm.patchValue({ productId: null });
    if (this.productSearchDebounce) {
      clearTimeout(this.productSearchDebounce);
    }
    this.productSearchDebounce = setTimeout(() => {
      this.productSearchPage = 0;
      this.loadProductSearchResults();
    }, 250);
  }

  loadProductSearchResults(): void {
    this.productSearchLoading = true;
    this.productService.getProducts(this.productSearchPage, this.productSearchSize, this.productSearchQuery, false).subscribe({
      next: (page) => {
        this.productSearchResults = page.content;
        this.productSearchTotalPages = page.totalPages;
        this.productSearchTotalElements = page.totalElements;
        const selectedProductId = this.initializeForm.value.productId;
        this.selectedProduct = this.productSearchResults.find(product => product.id === selectedProductId);
        this.productSearchLoading = false;
      },
      error: (err) => {
        this.productSearchLoading = false;
        this.toastService.error(err.error?.message || 'Failed to load products');
      }
    });
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.initializeForm.patchValue({ productId: product.id });
  }

  previousProductPage(): void {
    if (this.productSearchPage === 0 || this.productSearchLoading) {
      return;
    }
    this.productSearchPage -= 1;
    this.loadProductSearchResults();
  }

  nextProductPage(): void {
    if (this.productSearchLoading || this.productSearchPage + 1 >= this.productSearchTotalPages) {
      return;
    }
    this.productSearchPage += 1;
    this.loadProductSearchResults();
  }

  submitInitialize(): void {
    if (this.initializeForm.invalid) {
      return;
    }
    if (!this.selectedProduct || this.initializeForm.value.productId !== this.selectedProduct.id) {
      this.toastService.error('Select a valid product from the list before initializing stock');
      return;
    }
    if (!this.isThresholdConfigurationValid(this.initializeForm.value.reorderPoint, this.initializeForm.value.maxCapacity)) {
      return;
    }

    const payload = this.initializeForm.value as InitializeStockPayload;
    this.submitting = true;
    this.stockService.initializeStock(payload).subscribe({
      next: () => {
        this.toastService.success('Stock row initialized successfully');
        this.submitting = false;
        this.closeInitializeModal();
        if (payload.warehouseId !== this.selectedWarehouseId) {
          this.selectedWarehouseId = payload.warehouseId;
        }
        this.refresh();
      },
      error: (err) => {
        this.toastService.error(this.extractStockActionError(err, 'Failed to initialize stock row'), 7000);
        this.submitting = false;
      }
    });
  }

  openAdjustModal(stock: StockLevel, mode: 'movement' | 'threshold' = 'movement'): void {
    if (mode === 'threshold' && !this.canManageThresholds()) {
      this.toastService.warning('Only admins and inventory managers can edit thresholds for a stock row.');
      return;
    }

    this.selectedStock = stock;
    this.adjustmentMode = mode;
    this.adjustModalOpen = true;
    this.adjustForm.reset({
      quantityDelta: mode === 'threshold' ? 0 : 0,
      reason: 'DATA_CORRECTION',
      notes: '',
      reorderPoint: stock.reorderPoint,
      maxCapacity: stock.maxCapacity
    });
  }

  closeAdjustModal(): void {
    this.adjustModalOpen = false;
    this.adjustmentMode = 'movement';
    this.selectedStock = undefined;
  }

  submitAdjustment(): void {
    if (!this.selectedStock || this.adjustForm.invalid) {
      return;
    }

    if (this.adjustmentMode === 'threshold' && !this.canManageThresholds()) {
      this.toastService.warning('Only admins and inventory managers can edit thresholds for a stock row.');
      this.closeAdjustModal();
      return;
    }

    if (!this.isThresholdConfigurationValid(this.adjustForm.value.reorderPoint, this.adjustForm.value.maxCapacity)) {
      return;
    }

    const quantityDelta = Number(this.adjustForm.value.quantityDelta);
    if (quantityDelta === 0) {
      if (this.hasThresholdChanges()) {
        this.submitSingleRowThresholdUpdate();
        return;
      }

      this.toastService.warning('Change the quantity or update the reorder/max-capacity settings before submitting.');
      return;
    }

    const payload: AdjustStockPayload = {
      productId: this.selectedStock.productId,
      quantityDelta,
      reason: this.adjustForm.value.reason,
      notes: this.adjustForm.value.notes || undefined
    };

    if (this.canManageThresholds()) {
      payload.reorderPoint = this.adjustForm.value.reorderPoint;
      payload.maxCapacity = this.adjustForm.value.maxCapacity;
    }

    this.submitting = true;
    this.stockService.adjustStock(this.selectedStock.warehouseId, payload).subscribe({
      next: () => {
        this.toastService.success('Stock updated successfully');
        this.submitting = false;
        this.closeAdjustModal();
        this.refresh();
      },
      error: (err) => {
        this.toastService.error(this.extractStockActionError(err, 'Failed to update stock'), 7000);
        this.submitting = false;
      }
    });
  }

  jumpToStock(item: StockLevel): void {
    this.selectedWarehouseId = item.warehouseId;
    this.loadSelectedWarehouseStock();
  }

  formatReason(reason: string): string {
    return reason.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  stockCapacityLabel(item: StockLevel): string {
    if (item.maxCapacity == null) {
      return 'Capacity alert';
    }
    return item.quantity > item.maxCapacity ? 'Over item max' : 'At item max';
  }

  productSignal(product: Product): string {
    if ((product.totalStock ?? 0) <= (product.reorderLevel ?? 0)) {
      return 'Needs replenishment';
    }
    return product.active ? 'Active catalog item' : 'Inactive';
  }

  defaultTransferQuantity(item: StockLevel): number {
    return Math.max(1, Math.min(item.availableQty, item.overstock ? Math.ceil(item.availableQty / 2) : item.availableQty));
  }

  get selectedRows(): StockLevel[] {
    return this.currentWarehouseStock.filter(item => this.selectedStockIds.has(item.id));
  }

  get areAllVisibleSelected(): boolean {
    return this.currentWarehouseStock.length > 0 && this.currentWarehouseStock.every(item => this.selectedStockIds.has(item.id));
  }

  get transferDestinationOptions(): Warehouse[] {
    return this.warehouses.filter(wh => wh.id !== this.selectedWarehouseId);
  }

  get selectedRowNames(): string {
    return this.selectedRows
      .slice(0, 4)
      .map(item => item.productName || `Product #${item.productId}`)
      .join(', ') + (this.selectedRows.length > 4 ? ` +${this.selectedRows.length - 4} more` : '');
  }

  get selectedQuantitySummary(): string {
    const totalAvailable = this.selectedRows.reduce((sum, item) => sum + item.availableQty, 0);
    return `${totalAvailable} units available across the selected rows`;
  }

  get selectedWarehouseName(): string {
    return this.warehouses.find(wh => wh.id === this.selectedWarehouseId)?.name || 'No warehouse selected';
  }

  isZeroDeltaAdjustment(): boolean {
    return Number(this.adjustForm.value.quantityDelta ?? 0) === 0;
  }

  canSubmitAdjustment(): boolean {
    if (this.adjustForm.invalid || this.submitting || !this.selectedStock) {
      return false;
    }

    if (this.adjustmentHasBlockingIssue()) {
      return false;
    }

    if (!this.isZeroDeltaAdjustment()) {
      return true;
    }

    return this.hasThresholdChanges();
  }

  adjustmentActionLabel(): string {
    if (!this.isZeroDeltaAdjustment()) {
      return 'Apply Adjustment';
    }

    return this.hasThresholdChanges() ? 'Update Thresholds' : 'Apply Adjustment';
  }

  getWarehouseRemainingCapacity(warehouseId: number): number | null {
    const warehouse = this.warehouses.find(wh => wh.id === warehouseId);
    if (!warehouse || warehouse.totalStorageCapacity == null) {
      return null;
    }

    return Math.max(
      0,
      warehouse.totalStorageCapacity - (warehouse.currentCapacityUtilization || 0)
    );
  }

  warehouseCapacityHelperText(warehouseId: number): string {
    const warehouse = this.warehouses.find(wh => wh.id === warehouseId);
    if (!warehouse || warehouse.totalStorageCapacity == null) {
      return 'This warehouse has no tracked total-capacity limit, so only the item-level max applies here.';
    }

    const usedCapacity = warehouse.currentCapacityUtilization || 0;
    const remainingCapacity = this.getWarehouseRemainingCapacity(warehouseId) ?? 0;
    return `${warehouse.name} is using ${usedCapacity} of ${warehouse.totalStorageCapacity} tracked unit(s). Additions can go beyond this tracked capacity, but the warehouse will be flagged as over capacity.`;
  }

  requiresMovementReason(): boolean {
    return this.adjustmentMode === 'movement';
  }

  adjustModalTitle(): string {
    return this.adjustmentMode === 'threshold' ? 'Edit Thresholds' : 'Adjust Stock Quantity';
  }

  adjustmentModeLabel(): string {
    if (this.adjustmentMode === 'threshold') {
      return 'Threshold update mode';
    }

    if (this.isZeroDeltaAdjustment()) {
      return 'Movement mode';
    }

    return this.projectedQuantityDelta() > 0 ? 'Stock increase mode' : 'Stock decrease mode';
  }

  adjustmentModeHint(): string {
    if (this.adjustmentMode === 'threshold') {
      return 'You can update the reorder point or max capacity without changing the quantity.';
    }

    if (this.isZeroDeltaAdjustment()) {
      return 'Enter a positive or negative quantity to record a physical stock movement.';
    }

    return 'Reason and notes will be recorded because this changes the physical on-hand quantity.';
  }

  hasReservedPressure(item: StockLevel): boolean {
    return item.reservedQty > 0;
  }

  reservedSignalLabel(item: StockLevel): string {
    if (item.availableQty === 0 && item.reservedQty > 0) {
      return 'Fully reserved';
    }

    return `${item.reservedQty} reserved`;
  }

  isWarehouseCapacityTight(item: StockLevel): boolean {
    const warehouse = this.warehouses.find(wh => wh.id === item.warehouseId);
    if (!warehouse || warehouse.totalStorageCapacity == null) {
      return false;
    }

    const remainingCapacity = this.getWarehouseRemainingCapacity(item.warehouseId) ?? 0;
    const tightThreshold = Math.max(3, Math.ceil(warehouse.totalStorageCapacity * 0.1));
    return remainingCapacity > 0 && remainingCapacity <= tightThreshold;
  }

  showNormalSignal(item: StockLevel): boolean {
    return !item.lowStock
      && !item.overstock
      && !this.hasReservedPressure(item)
      && !this.isWarehouseCapacityTight(item);
  }

  adjustmentPreviewTone(): 'neutral' | 'warning' | 'danger' | 'success' {
    if (!this.selectedStock) {
      return 'neutral';
    }

    if (this.adjustmentHasBlockingIssue()) {
      return 'danger';
    }

    if (this.isZeroDeltaAdjustment()) {
      return this.hasThresholdChanges() ? 'success' : 'warning';
    }

    return 'success';
  }

  adjustmentPreviewTitle(): string {
    if (!this.selectedStock) {
      return 'Adjustment preview';
    }

    const blockingMessage = this.getAdjustmentBlockingMessage();
    if (blockingMessage) {
      return 'Action blocked';
    }

    if (this.isZeroDeltaAdjustment()) {
      return this.hasThresholdChanges() ? 'Threshold update ready' : 'No stock change yet';
    }

    return this.projectedQuantityDelta() > 0 ? 'Stock increase ready' : 'Stock decrease ready';
  }

  adjustmentPreviewMessage(): string {
    if (!this.selectedStock) {
      return 'Select a stock row to preview the outcome.';
    }

    const blockingMessage = this.getAdjustmentBlockingMessage();
    if (blockingMessage) {
      return blockingMessage;
    }

    if (this.isZeroDeltaAdjustment()) {
      if (this.hasThresholdChanges()) {
        return `This will keep on-hand stock at ${this.selectedStock.quantity} and update the reorder and max-capacity settings only.`;
      }

      return 'Change the quantity or update the reorder/max-capacity settings to unlock a valid action.';
    }

    const projectedQuantity = this.getProjectedQuantity();
    const projectedAvailable = this.getProjectedAvailableQuantity();
    const projectedRemainingWarehouseCapacity = this.getProjectedRemainingWarehouseCapacity();
    const warehouseCapacityText = projectedRemainingWarehouseCapacity == null
      ? 'No warehouse-wide capacity limit applies to this move.'
      : `Warehouse free space after this action: ${projectedRemainingWarehouseCapacity} unit(s).`;

    return `On-hand will move from ${this.selectedStock.quantity} to ${projectedQuantity}, and available stock will be ${projectedAvailable}. ${warehouseCapacityText}`;
  }

  thresholdPreviewTitle(): string {
    if (!this.selectedStock || !this.hasThresholdChanges()) {
      return 'No threshold changes yet';
    }

    return 'Threshold update ready';
  }

  thresholdPreviewMessage(): string {
    if (!this.selectedStock) {
      return 'Select a stock row to preview threshold changes.';
    }

    if (!this.hasThresholdChanges()) {
      return 'Change the reorder point or max capacity to enable a threshold update.';
    }

    const nextReorderPoint = Number(this.adjustForm.value.reorderPoint ?? 0);
    const nextMaxCapacity = this.normalizeNullableNumber(this.adjustForm.value.maxCapacity);
    const maxCapacityLabel = nextMaxCapacity == null ? 'No item max cap will be enforced.' : `New item max capacity: ${nextMaxCapacity}.`;
    return `Reorder point will change from ${this.selectedStock.reorderPoint} to ${nextReorderPoint}. ${maxCapacityLabel}`;
  }

  private buildStockQueryOptions(includeQuery: boolean = true): StockQueryOptions {
    const lowStockOnly = this.signalFilter === 'low' || this.signalFilter === 'attention';
    const overstockOnly = this.signalFilter === 'over' || this.signalFilter === 'attention';

    return {
      query: includeQuery ? this.searchQuery : undefined,
      lowStockOnly,
      overstockOnly,
      sortBy: this.sortBy,
      sortDir: this.sortDir
    };
  }

  private applyStockSearch(stock: StockLevel[], apply: (filtered: StockLevel[]) => void): void {
    const query = this.searchQuery.trim();
    if (!query) {
      apply(stock);
      return;
    }

    this.productService.getProducts(0, 200, query, true).subscribe({
      next: (page) => {
        const matchedProducts = new Map(page.content.map(product => [product.id, product] as const));
        apply(stock
          .map(item => {
            const matchedProduct = matchedProducts.get(item.productId);
            return matchedProduct ? {
              ...item,
              productName: item.productName || matchedProduct.name,
              sku: item.sku || matchedProduct.sku
            } : item;
          })
          .filter(item => this.matchesStockSearch(item, matchedProducts, query)));
      },
      error: () => {
        apply(stock.filter(item => this.matchesStockSearch(item, new Map(), query)));
      }
    });
  }

  private matchesStockSearch(item: StockLevel, matchedProducts: Map<number, Product>, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    return String(item.productId).includes(normalized)
      || (item.productName || '').toLowerCase().includes(normalized)
      || (item.sku || '').toLowerCase().includes(normalized)
      || (item.warehouseName || '').toLowerCase().includes(normalized)
      || matchedProducts.has(item.productId);
  }

  private retainVisibleSelections(): void {
    const visibleIds = new Set(this.currentWarehouseStock.map(item => item.id));
    this.selectedStockIds.forEach(id => {
      if (!visibleIds.has(id)) {
        this.selectedStockIds.delete(id);
      }
    });
  }

  private handleServiceError(err: any, markServiceUnavailable: boolean = true): void {
    console.error('Stock control error:', err);
    this.loading = false;
    if (markServiceUnavailable && (err.status === 503 || err.status === 504 || err.status === 0)) {
      this.serviceError = true;
      return;
    }
    this.toastService.error(err.error?.message || 'Failed to load stock control data');
  }

  private isThresholdConfigurationValid(reorderPoint?: number | null, maxCapacity?: number | null): boolean {
    const normalizedReorderPoint = reorderPoint ?? 0;

    if (normalizedReorderPoint < 0) {
      this.toastService.error('Reorder point cannot be negative');
      return false;
    }

    if (maxCapacity !== null && maxCapacity !== undefined) {
      if (maxCapacity <= 0) {
        this.toastService.error('Max capacity must be greater than zero');
        return false;
      }
      if (normalizedReorderPoint > 0 && maxCapacity <= normalizedReorderPoint) {
        this.toastService.error('Max capacity must be greater than reorder point');
        return false;
      }
    }

    return true;
  }

  private hasThresholdChanges(): boolean {
    if (!this.selectedStock) {
      return false;
    }

    const nextReorderPoint = Number(this.adjustForm.value.reorderPoint ?? 0);
    const nextMaxCapacity = this.normalizeNullableNumber(this.adjustForm.value.maxCapacity);
    const currentMaxCapacity = this.normalizeNullableNumber(this.selectedStock.maxCapacity);

    return nextReorderPoint !== this.selectedStock.reorderPoint
      || nextMaxCapacity !== currentMaxCapacity;
  }

  private adjustmentHasBlockingIssue(): boolean {
    return !!this.getAdjustmentBlockingMessage();
  }

  private getAdjustmentBlockingMessage(): string | null {
    if (!this.selectedStock || this.adjustForm.invalid) {
      return null;
    }

    const quantityDelta = this.projectedQuantityDelta();
    const projectedQuantity = this.getProjectedQuantity();
    if (projectedQuantity == null) {
      return null;
    }

    if (quantityDelta < 0 && projectedQuantity < 0) {
      return `This removal would drop on-hand stock below zero. Current on-hand is ${this.selectedStock.quantity}.`;
    }

    if (quantityDelta < 0 && projectedQuantity < this.selectedStock.reservedQty) {
      const removableUnits = Math.max(0, this.selectedStock.quantity - this.selectedStock.reservedQty);
      return `Only ${removableUnits} unreserved unit(s) can be removed right now because ${this.selectedStock.reservedQty} unit(s) are already reserved.`;
    }

    return null;
  }

  private submitSingleRowThresholdUpdate(): void {
    if (!this.selectedStock) {
      return;
    }

    const payload: BulkThresholdUpdatePayload = {
      productIds: [this.selectedStock.productId],
      reorderPoint: Number(this.adjustForm.value.reorderPoint ?? 0),
      maxCapacity: this.normalizeNullableNumber(this.adjustForm.value.maxCapacity)
    };

    this.submitting = true;
    this.stockService.updateBulkThresholds(this.selectedStock.warehouseId, payload).subscribe({
      next: () => {
        this.toastService.success(`Updated thresholds for ${this.selectedStock?.productName || 'the selected product'}`);
        this.submitting = false;
        this.closeAdjustModal();
        this.refresh();
      },
      error: (err) => {
        this.toastService.error(this.extractStockActionError(err, 'Failed to update thresholds'), 7000);
        this.submitting = false;
      }
    });
  }

  private extractStockActionError(err: any, fallback: string): string {
    if (err?.status === 403) {
      if (this.adjustmentMode === 'threshold') {
        return 'Your current role cannot change reorder points or max capacities. Sign in as an admin or inventory manager to edit thresholds.';
      }
      return 'Your current role does not have permission to perform this stock action.';
    }

    const backendMessage = err?.error?.message || err?.message;
    if (!backendMessage) {
      return fallback;
    }

    if (backendMessage.includes('Warehouse capacity exceeded') || backendMessage.includes('is full for this move')) {
      return `${backendMessage} Reduce the quantity, transfer stock out first, or increase the warehouse capacity.`;
    }

    if (backendMessage.includes('cannot exceed its max capacity')) {
      return `${backendMessage} Lower the quantity, raise the item max capacity, or transfer units to another warehouse.`;
    }

    if (backendMessage.includes('Quantity delta cannot be zero')) {
      if (this.hasThresholdChanges()) {
        return 'Use the threshold update path for reorder/max-capacity changes, or enter a non-zero quantity delta for a stock movement.';
      }
      return 'Enter a positive or negative quantity change before applying the adjustment.';
    }

    if (backendMessage.includes('reserved quantity')) {
      return `${backendMessage} Release the reservation first, or reduce the adjustment amount.`;
    }

    return backendMessage;
  }

  private normalizeNullableNumber(value: number | string | null | undefined): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private projectedQuantityDelta(): number {
    return Number(this.adjustForm.value.quantityDelta ?? 0);
  }

  private getProjectedQuantity(): number | null {
    if (!this.selectedStock) {
      return null;
    }

    return this.selectedStock.quantity + this.projectedQuantityDelta();
  }

  private getProjectedAvailableQuantity(): number | null {
    if (!this.selectedStock) {
      return null;
    }

    const projectedQuantity = this.getProjectedQuantity();
    if (projectedQuantity == null) {
      return null;
    }

    return Math.max(0, projectedQuantity - this.selectedStock.reservedQty);
  }

  private getProjectedRemainingWarehouseCapacity(): number | null {
    if (!this.selectedStock) {
      return null;
    }

    const warehouse = this.warehouses.find(wh => wh.id === this.selectedStock?.warehouseId);
    if (!warehouse || warehouse.totalStorageCapacity == null) {
      return null;
    }

    return Math.max(
      0,
      warehouse.totalStorageCapacity - ((warehouse.currentCapacityUtilization || 0) + Math.max(0, this.projectedQuantityDelta()))
    );
  }
}
