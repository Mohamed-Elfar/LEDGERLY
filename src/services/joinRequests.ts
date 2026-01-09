import { supabase } from "../../supabaseClient";
import { JoinRequest, JoinRequestStatus, Role } from "../types/models";

export async function getUserJoinRequest(userId: string, orgId: string) {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (
    error &&
    error.code !== "PGRST116" &&
    error.details?.includes("0 rows") !== true
  ) {
    throw error;
  }
  return data as JoinRequest | null;
}

export async function createJoinRequest(params: {
  userId: string;
  email: string;
  username?: string;
  orgId: string;
  orgName?: string;
  role?: Role;
}) {
  const { userId, email, username, orgId, orgName, role } = params;

  console.log("[createJoinRequest] Creating with params:", {
    userId,
    email,
    orgId,
    orgName,
  });

  const { data, error } = await supabase
    .from("join_requests")
    .upsert(
      {
        user_id: userId,
        email,
        username,
        org_id: orgId,
        org_name: orgName,
        role: role ?? "STAFF",
        status: "PENDING" as JoinRequestStatus,
      },
      { onConflict: "user_id,org_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[createJoinRequest] Error:", error);
    throw error;
  }

  console.log("[createJoinRequest] Success:", data);
  return data as JoinRequest;
}

export async function getOrgJoinRequests(orgId: string) {
  console.log("[getOrgJoinRequests] Fetching pending requests for org:", orgId);

  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOrgJoinRequests] Error:", error);
    throw error;
  }

  console.log("[getOrgJoinRequests] Found", data?.length || 0, "requests");
  return (data as JoinRequest[]) || [];
}

export async function approveJoinRequest(request: JoinRequest) {
  const { id } = request;

  const { data, error } = await supabase.rpc("approve_join_request", {
    request_id: id,
  });

  if (error) throw error;
  if (data && !data.success)
    throw new Error(data.message || "Failed to approve");

  return data;
}

export async function rejectJoinRequest(requestId: string) {
  const { data, error } = await supabase.rpc("reject_join_request", {
    request_id: requestId,
  });

  if (error) throw error;
  if (data && !data.success)
    throw new Error(data.message || "Failed to reject");

  return data;
}
