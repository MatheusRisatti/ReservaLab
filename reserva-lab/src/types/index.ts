export type Role = 'ADMIN' | 'USER';

export type ReservationStatus =
  | 'SCHEDULED'
  | 'ACTIVE_LOAN'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

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
  is_active: boolean;
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
