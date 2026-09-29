export type SupplyStatus = 'UPCOMING' | 'AVAILABLE' | 'PARTIALLY_SOLD' | 'SOLD_OUT' | 'EXPIRED';
export type ProduceForm  = 'RAW' | 'PROCESSED';
export type ProduceGrade = 'A' | 'B' | 'C';
export type DemandStatus = 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
export type OrderStatus  = 'PENDING' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'UPI';

export interface Supply {
  id: string;
  farmId: string;
  zoneId: string | null;
  cropName: string;
  predictedHarvestDate: string;
  estimatedQuantityKg: number;
  availableQuantityKg: number;
  pricePerKg: number;
  minOrderKg: number;
  grade: ProduceGrade;
  form: ProduceForm;
  status: SupplyStatus;
  isPublished: boolean;
  notes: string | null;
  district: string;
  state: string;
  farm?: { name: string; district: string; state: string };
  zone?: { name: string };
  // Farmer extras
  soldQuantityKg?: number;
  totalRevenue?: number;
  pendingOrders?: number;
}

export interface Demand {
  id: string;
  customerId: string;
  cropName: string;
  quantityKg: number;
  maxPricePerKg: number | null;
  neededByDate: string;
  preferredDistrict: string | null;
  preferredState: string;
  form: ProduceForm;
  status: DemandStatus;
  notes: string | null;
  isNearby?: boolean;
  customer?: { user: { name: string } };
  demandMatches?: DemandMatch[];
}

export interface DemandMatch {
  id: string;
  supplyId: string;
  demandId: string;
  supply: Supply;
}

export interface Order {
  id: string;
  supplyId: string;
  customerId: string;
  farmerId: string;
  demandId: string | null;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  deliveryAddress: string;
  farmerNote: string | null;
  customerNote: string | null;
  cancelledBy: 'FARMER' | 'CUSTOMER' | null;
  cancelReason: string | null;
  createdAt: string;
  supply?: { cropName: string; form: ProduceForm; farm?: { name: string; district: string } };
  customer?: { user: { name: string; email: string } };
}

export interface OrderBook {
  summary: {
    totalRevenue: number;
    totalQuantitySoldKg: number;
    pendingOrderCount: number;
    deliveredOrderCount: number;
  };
  byCrop: { cropName: string; quantitySoldKg: number; revenue: number; orderCount: number }[];
  monthly: { month: string; revenue: number }[];
  recentOrders: Order[];
}

export interface BrowseSuppliesResult {
  total: number;
  page: number;
  limit: number;
  supplies: Supply[];
}

export interface PlaceOrderPayload {
  supplyId: string;
  quantityKg: number;
  paymentMethod: PaymentMethod;
  deliveryAddress: string;
  demandId?: string;
  customerNote?: string;
}

export interface CreateDemandPayload {
  cropName: string;
  quantityKg: number;
  maxPricePerKg?: number;
  neededByDate: string;
  preferredDistrict?: string;
  form?: ProduceForm;
  notes?: string;
}

export interface UpdateDemandPayload {
  quantityKg?: number;
  maxPricePerKg?: number;
  neededByDate?: string;
  notes?: string;
  status?: 'CANCELLED';
}

export interface UpdateSupplyPayload {
  pricePerKg?: number;
  availableQuantityKg?: number;
  minOrderKg?: number;
  grade?: ProduceGrade;
  form?: ProduceForm;
  notes?: string;
  isPublished?: boolean;
}
