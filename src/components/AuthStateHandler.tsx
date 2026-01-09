import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { PasswordResetModal } from "./PasswordResetModal";

interface AuthStateHandlerProps {
  children: React.ReactNode;
}

/**
 * This component listens for auth state changes and shows the password reset
 * modal if the user just signed in via magic link (passwordless auth).
 */
export function AuthStateHandler({ children }: AuthStateHandlerProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckedAuth(true);
      // Check if user just logged in via magic link
      if (session && !session.user.user_metadata?.password_set) {
        setShowPasswordModal(true);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      // Show modal when user signs in via magic link
      if (event === "SIGNED_IN" && session) {
        setShowPasswordModal(true);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (!checkedAuth) {
    return null;
  }

  return (
    <>
      {children}
      <PasswordResetModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
