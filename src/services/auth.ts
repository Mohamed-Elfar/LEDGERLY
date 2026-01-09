import { supabase, SUPABASE_ANON_KEY } from "../../supabaseClient";
import { JoinRequestStatus, Role, UserProfile } from "../types/models";
import { createJoinRequest, getUserJoinRequest } from "./joinRequests";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "tempapp://reset-password",
  });
  if (error) throw error;
}

export async function sendPasswordResetOTP(email: string) {
  try {
    // Generate OTP and store in database
    const { data, error } = await supabase.rpc("generate_password_reset_otp", {
      email_param: email,
    });

    if (error) throw error;

    const otp = data;
    console.log("[Password Reset OTP] Generated for:", email);

    // Send OTP via Edge Function (auto-uses correct project + headers)
    const { error: fnError } = await supabase.functions.invoke(
      "send-password-reset-otp",
      {
        body: { email, otp },
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );

    if (fnError) {
      throw new Error(fnError.message || "Failed to send OTP email");
    }

    return true;
  } catch (error) {
    console.error("[Password Reset OTP Error]", error);
    throw error;
  }
}

export async function verifyPasswordResetOTP(email: string, otp: string) {
  try {
    const { data, error } = await supabase.rpc("verify_password_reset_otp", {
      email_param: email,
      otp_code_param: otp,
    });

    if (error) throw error;
    if (!data) throw new Error("Invalid or expired OTP");

    return true;
  } catch (error) {
    throw error;
  }
}

export async function verifyOTPAndResetPassword(
  email: string,
  token: string,
  newPassword: string
) {
  // First verify the OTP
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (verifyError) throw verifyError;
  if (!data.session) throw new Error("Failed to verify OTP");

  // Now update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
) {
  try {
    const { data, error } = await supabase.rpc("reset_password_after_otp", {
      email_param: email,
      otp_code_param: otp,
      new_password: newPassword,
    });

    if (error) throw error;
    if (!data) throw new Error("Failed to reset password");

    return true;
  } catch (error) {
    throw error;
  }
}

export async function signUp(
  email: string,
  password: string,
  orgId: string,
  orgName: string,
  username: string,
  role: Role,
  isJoinRequest = false
) {
  let finalOrgName = orgName;

  // If joining an existing org, fetch the real org name from the database
  if (isJoinRequest && !orgName) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("org_id", orgId)
      .single();

    finalOrgName = orgData?.name || orgId;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        org_id: orgId,
        org_name: finalOrgName,
        role,
        username,
        join_status: isJoinRequest
          ? ("PENDING" as JoinRequestStatus)
          : "ACTIVE",
        join_org_id: isJoinRequest ? orgId : undefined,
        join_org_name: isJoinRequest ? finalOrgName : undefined,
      },
    },
  });
  if (error) throw error;

  const userId = data.user?.id;
  // Profile insert requires an authenticated session (auth.uid()). If email confirmation
  // is required, signUp returns no session, so defer creation until first sign-in.
  if (userId && data.session) {
    if (isJoinRequest) {
      await createJoinRequest({
        userId,
        email,
        username,
        orgId,
        orgName: finalOrgName,
        role,
      });
      return data.user;
    }

    const { error: orgError } = await supabase.from("organizations").upsert({
      org_id: orgId,
      name: finalOrgName,
      created_by: userId,
    });
    if (orgError) throw orgError;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        org_id: orgId,
        org_name: finalOrgName,
        role,
        username,
      });
    if (profileError) throw profileError;
  }
  return data.user;
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) return null;

  const metadata = user.user_metadata as any;
  const joinStatus = metadata?.join_status as JoinRequestStatus | undefined;
  const joinOrgId = metadata?.join_org_id as string | undefined;
  const joinOrgName = metadata?.join_org_name as string | undefined;
  const metaRole = (metadata?.role as Role | undefined) ?? "STAFF";
  const metaUsername =
    metadata?.username ?? user.email?.split("@")[0] ?? "user";

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) {
    return { ...(data as UserProfile), status: "ACTIVE" };
  }

  // If profile is missing (e.g., sign-up required email confirmation so we never inserted),
  // create it now using metadata from the auth user.
  const missing =
    error?.code === "PGRST116" ||
    error?.code === "406" ||
    error?.details?.includes("0 rows") ||
    error?.message?.includes("406");

  if (!missing) {
    if (error) throw error;
    return null;
  }

  // Join request flow: do not auto-create profile until approved.
  if (joinOrgId) {
    const orgName = joinOrgName ?? joinOrgId;
    const role = (metadata?.role as Role) ?? "STAFF";
    const username = metaUsername;

    const existingRequest = await getUserJoinRequest(user.id, joinOrgId);

    if (!existingRequest && joinStatus === "PENDING") {
      await createJoinRequest({
        userId: user.id,
        email: user.email ?? "",
        username,
        orgId: joinOrgId,
        orgName,
        role,
      });
      return {
        id: user.id,
        org_id: joinOrgId,
        org_name: orgName,
        role,
        username,
        status: "PENDING",
      } as UserProfile;
    }

    const effectiveStatus: JoinRequestStatus =
      existingRequest?.status ?? (joinStatus as JoinRequestStatus) ?? "PENDING";

    if (effectiveStatus === "APPROVED") {
      const { data: inserted, error: insertError } = await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          org_id: joinOrgId,
          org_name: orgName,
          role,
          username,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.auth.updateUser({
        data: { join_status: "APPROVED" as JoinRequestStatus },
      });

      return { ...(inserted as UserProfile), status: "ACTIVE" };
    }

    if (effectiveStatus === "REJECTED") {
      return {
        id: user.id,
        org_id: joinOrgId,
        org_name: orgName,
        role,
        username,
        status: "REJECTED",
      } as UserProfile;
    }

    return {
      id: user.id,
      org_id: joinOrgId,
      org_name: orgName,
      role,
      username,
      status: "PENDING",
    } as UserProfile;
  }

  // Existing behavior for creating a fresh profile when metadata is present.
  const orgId = (metadata as any)?.org_id as string | undefined;
  const orgNameFromMetadata = (metadata as any)?.org_name as string | undefined;

  let orgName = orgNameFromMetadata;
  if (!orgName && orgId) {
    const namePart = orgId.split("-")[0];
    orgName =
      namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  }
  orgName = orgName ?? "Organization";
  const role = metaRole;
  const username = metaUsername;

  if (!orgId) {
    // Without org_id we cannot create a profile safely.
    throw new Error("Profile missing and org_id not found in user metadata");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_profiles")
    .insert({
      id: user.id,
      org_id: orgId,
      org_name: orgName,
      role,
      username,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted as UserProfile;
}
