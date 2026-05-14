export interface StockMovement {
  id: number;
  eventId: string;
  productId: number;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  movementType: string;
  quantityDelta: number;
  quantityAfter: number;
  referenceId: string | null;
  referenceType: string | null;
  transactionId: string | null;
  notes: string | null;
  occurredAt: string;
  recordedAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  pageable: any;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
