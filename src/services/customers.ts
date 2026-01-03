import { supabase } from "../../supabaseClient";
import { Customer } from "../types/models";

export async function upsertCustomer(
  orgId: string,
  fullName: string,
  phone: string,
  address?: string
) {
  const { data, error } = await supabase
    .from("customers")
    .upsert(
      { org_id: orgId, name: fullName, full_name: fullName, phone, address },
      { onConflict: "org_id,phone" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function listCustomers(orgId: string, search: string) {
  let query = supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const customers = (data as Customer[]) ?? [];

  // Recompute balances from transactions to keep list in sync with detail view.
  const ids = customers.map((c) => c.id);
  if (ids.length === 0) return customers;

  const { data: txs, error: txError } = await supabase
    .from("transactions")
    .select("customer_id, tx_type, amount")
    .in("customer_id", ids);
  if (txError) throw txError;

  const balanceByCustomer: Record<string, number> = {};
  (txs ?? []).forEach((tx) => {
    const current = balanceByCustomer[tx.customer_id] ?? 0;
    const next =
      tx.tx_type === "DEBT"
        ? current + tx.amount
        : current - Math.abs(tx.amount);
    balanceByCustomer[tx.customer_id] = next;
  });

  const hydrated = customers.map((c) => {
    const computedBalance =
      typeof balanceByCustomer[c.id] === "number"
        ? balanceByCustomer[c.id]
        : c.balance ?? 0;

    return {
      ...c,
      balance: computedBalance,
    };
  });

  const zeroBalanceIds = hydrated
    .filter((c) => Math.abs(c.balance) < 1e-6)
    .map((c) => c.id);

  if (zeroBalanceIds.length > 0) {
    await supabase.from("customers").delete().in("id", zeroBalanceIds);
  }

  return hydrated.filter((c) => Math.abs(c.balance) >= 1e-6);
}
