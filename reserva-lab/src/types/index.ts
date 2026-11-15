export type Role = 'ADMIN' | 'USER';

export type ReservationStatus =
  | 'SCHEDULED'
  | 'ACTIVE_LOAN'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type ApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type UserStatus = 'LIBERADO' | 'BLOQUEADO' | 'LIMITE_ATINGIDO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_manually_blocked: boolean;
  status?: UserStatus;
  status_reason?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Item {
  id: string;
  name: string;
  patrimony_code: string;
  quantity?: number;
  available_quantity?: number;
  is_active: boolean;
  is_available?: boolean;
  category_id: string;
  category?: Category;
}

export interface Loan {
  id: string;
  reservation_id: string;
  actual_pickup_at: string;
  actual_return_at?: string | null;
  return_observation?: string | null;
}

export interface Reservation {
  id: string;
  user_id: string;
  item_id: string;
  expected_pickup_at: string;
  expected_return_at: string;
  status: ReservationStatus;
  approval_status?: ApprovalStatus;
  request_reason?: string | null;
  admin_decision_reason?: string | null;
  decided_at?: string | null;
  item?: Item;
  loan?: Loan | null;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  max_rent_days: number;
  max_concurrent_items: number;
  updated_at: string;
}
