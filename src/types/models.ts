export type Role = "ADMIN" | "STAFF";

export interface Organization {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  org_id: string;
  org_name?: string;
  role: Role;
  username: string;
}

export interface Customer {
  id: string;
  org_id: string;
  full_name: string;
  phone: string;
  address?: string;
  balance: number;
}

export interface Transaction {
  id: string;
  org_id: string;
  customer_id: string;
  user_id: string;
  user_name: string;
  tx_type: "DEBT" | "PAYMENT";
  amount: number;
  created_at: string;
}
