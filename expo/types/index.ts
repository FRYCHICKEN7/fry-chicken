export type UserRole = 'admin' | 'branch' | 'delivery' | 'customer';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  identityNumber?: string;
  profileImage: string;
  branchId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  isCombo: boolean;
  comboType?: 'personal' | 'familiar' | 'promotion';
  includesDrink?: boolean;
  available: boolean;
  isPrize?: boolean;
  pointsRequired?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedDrink?: Product;
  extras: CartExtra[];
  notes?: string;
  isPrizeRedemption?: boolean;
}

export interface CartExtra {
  product: Product;
  quantity: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  isOpen: boolean;
  deliveryZones: DeliveryZone[];
  code: string;
  password: string;
  latitude?: number;
  longitude?: number;
  mapsLink?: string;
  businessHours?: BusinessHours[];
  municipioId?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  sucursalId?: string;
  municipioId?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  selectedDrink?: Product;
  isPrizeRedemption?: boolean;
  pointsUsed?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  branchId: string;
  municipioId?: string;
  zonaId?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryZone?: string;
  deliveryId?: string;
  deliveryRequestedBy?: string;
  requestApproved?: boolean;
  assignedByBranch?: boolean;
  couponCode?: string;
  notes?: string;
  receiptImage?: string;
  totalPointsRedeemed?: number;
  isPrizeOrder?: boolean;
  transferAuthorized?: boolean;
  transferAuthorizedBy?: string;
  transferAuthorizedAt?: string;
  adminApproved?: boolean;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'rejected';

export type PaymentMethod = 'cash' | 'transfer';

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  distributed: boolean;
  scheduledDate?: string;
  description?: string;
}

export interface Promotion {
  id: string;
  image: string;
  title: string;
  action: 'cart' | 'category' | 'product';
  targetId?: string;
}

export interface PasswordRecoveryRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  temporaryPassword?: string;
  temporaryPasswordExpiresAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  foodRating: number;
  branchRating: number;
  deliveryRating?: number;
  comment?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  branchId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  type: 'complaint' | 'suggestion' | 'order_issue';
  orderNumber?: string;
  subject: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved';
  response?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dni: string;
  dniPhoto: string;
  branchId: string;
  deliveryCode: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  address: string;
  vehicleType: 'motorcycle' | 'bicycle' | 'car' | 'other';
  vehicleDescription?: string;
  plateNumber: string;
  password: string;
  isActive?: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'checking';
  holderName: string;
  rtn: string;
  isActive: boolean;
}

export interface TransferReceipt {
  id: string;
  orderId: string;
  imageUri: string;
  uploadedAt: string;
  verifiedBy?: string;
  verified: boolean;
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  theme: ThemeMode;
  promotionalPopup?: {
    enabled: boolean;
    imageUrl: string;
    action: 'cart' | 'category' | 'product';
    targetId?: string;
  };
}

export interface BusinessHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface MarketingPopup {
  id: string;
  image: string;
  productId: string;
  isActive: boolean;
  displayDuration: number;
}

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  buttonColor: string;
  whatsappButtonColor: string;
  whatsappIconUrl?: string;
  addToCartButtonColor: string;
  addToCartTextColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface BackupData {
  id: string;
  createdAt: string;
  size: number;
  type: 'local' | 'cloud';
}

export interface ImportLog {
  id: string;
  timestamp: string;
  source: 'excel' | 'json' | 'woocommerce';
  totalProducts: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  errors: string[];
  duplicates: { name: string; existingPrice: number; newPrice: number }[];
}

export interface DeliveryCompletionProof {
  id: string;
  orderId: string;
  deliveryId: string;
  type: 'delivered' | 'no_response';
  timestamp: string;
  waitTime?: number;
  callScreenshot?: string;
  whatsappScreenshot?: string;
  notes?: string;
}

export interface DeliveryRating {
  id: string;
  orderId: string;
  deliveryId: string;
  customerId: string;
  rating: number;
  reason?: string;
  createdAt: string;
}

export interface OrderCancellation {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  timestamp: string;
}

export interface OrderDelay {
  id: string;
  orderId: string;
  deliveryId: string;
  delayMinutes: number;
  reason: string;
  timestamp: string;
  compensation?: 'refund' | 'coupon';
  compensationAmount?: number;
}

export interface BranchNotification {
  id: string;
  branchId: string;
  type: 'delivery_completed' | 'order_rejected' | 'order_delayed' | 'order_cancelled' | 'order_claim_request';
  orderId: string;
  deliveryId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PointsSettings {
  enabled: boolean;
  conversionRate: number;
  redeemableCategories: string[];
  pointsIconUrl?: string;
}

export interface UserPoints {
  userId: string;
  availablePoints: number;
  totalPoints: number;
  lastUpdated: string;
}

export interface Municipality {
  id: string;
  nombre: string;
  activo: boolean;
  sucursalesAsignadas: string[];
  createdAt: string;
}

export interface AppStats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  totalDeliveries: number;
  topProducts: { name: string; quantity: number }[];
  salesByBranch: { branchName: string; total: number }[];
}
