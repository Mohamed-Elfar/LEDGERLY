import { supabase } from "../../supabaseClient";
import { Transaction } from "../types/models";

export async function addDebt(
  orgId: string,
  customerId: string,
  amount: number,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.rpc("apply_debt", {
    p_org_id: orgId,
    p_customer_id: customerId,
    p_amount: amount,
    p_user_id: userId,
    p_user_name: userName,
  });
  if (error) throw error;
  return data as Transaction;
}

export async function recordPayment(
  orgId: string,
  customerId: string,
  amount: number,
  userId: string,
  userName: string
) {
  const { data, error } = await supabase.rpc("apply_payment", {
    p_org_id: orgId,
    p_customer_id: customerId,
    p_amount: amount,
    p_user_id: userId,
    p_user_name: userName,
  });
  if (error) throw error;
  return data as Transaction;
}

export async function getHistory(orgId: string, customerId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Transaction[];
}
