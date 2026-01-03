import { supabase } from "../../supabaseClient";
import { Role, UserProfile } from "../types/models";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signUp(
  email: string,
  password: string,
  orgId: string,
  orgName: string,
  username: string,
  role: Role
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { org_id: orgId, org_name: orgName, role, username } },
  });
  if (error) throw error;

  const userId = data.user?.id;
  // Profile insert requires an authenticated session (auth.uid()). If email confirmation
  // is required, signUp returns no session, so defer creation until first sign-in.
  if (userId && data.session) {
    const { error: orgError } = await supabase.from("organizations").upsert({
      org_id: orgId,
      name: orgName,
      created_by: userId,
    });
    if (orgError) throw orgError;

    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        org_id: orgId,
        org_name: orgName,
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

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If profile is missing (e.g., sign-up required email confirmation so we never inserted),
  // create it now using metadata from the auth user.
  if (error) {
    const missing =
      error.code === "PGRST116" ||
      error.code === "406" ||
      error.details?.includes("0 rows") ||
      error.message?.includes("406");
    if (!missing) throw error;

    const orgId = (user.user_metadata as any)?.org_id as string | undefined;
    const orgNameFromMetadata = (user.user_metadata as any)?.org_name as
      | string
      | undefined;

    // Extract org name from org_id if not in metadata (e.g., "fullcare-ioxw" -> "Fullcare")
    let orgName = orgNameFromMetadata;
    if (!orgName && orgId) {
      const namePart = orgId.split("-")[0];
      orgName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }
    orgName = orgName ?? "Organization";
    const role =
      ((user.user_metadata as any)?.role as Role | undefined) ?? "ADMIN";
    const username =
      (user.user_metadata as any)?.username ??
      user.email?.split("@")[0] ??
      "user";

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

  return data as UserProfile;
}
