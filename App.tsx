import "react-native-gesture-handler";

import {
  NavigationContainer,
  DefaultTheme,
  LinkingOptions,
} from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Linking,
} from "react-native";

import { AppTabNavigator } from "./src/navigation/AppTabs";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { getProfile } from "./src/services/auth";
import { UserProfile } from "./src/types/models";
import { supabase } from "./supabaseClient";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0b1d2c",
    primary: "#2d8cff",
    card: "#0b1d2c",
    text: "#f2f6fc",
    border: "#1c3a52",
  },
};

const linking: LinkingOptions<any> = {
  prefixes: [
    "tempapp://",
    "https://tempapp.example.com",
    "http://localhost:8081",
    "exp://",
  ],
  config: {
    screens: {
      SignIn: {
        path: "signin",
        parse: {
          type: (type: string) => {
            if (type === "recovery") {
              // This will be handled by the auth state change
              return type;
            }
            return type;
          },
        },
      },
      SignUp: "signup",
    },
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    // Check for initial deep link URL
    Linking.getInitialURL().then((url) => {
      console.log("[Initial URL]", url);
      if (url?.includes("reset-password") || url?.includes("type=recovery")) {
        console.log("[Deep Link] Password reset detected from URL");
        setIsPasswordReset(true);
      }
    });

    // Listen for URL changes
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      console.log("[URL Event]", url);
      if (url?.includes("reset-password") || url?.includes("type=recovery")) {
        console.log("[Deep Link] Password reset detected");
        setIsPasswordReset(true);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        console.log("[Initial Session] User:", data.session?.user?.email);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Auth failed";
        setStatusMessage(message);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[Auth Event]", event, "Session:", !!newSession);
        setSession(newSession);
        if (!newSession) {
          setProfile(null);
          setIsPasswordReset(false);
        }
        // When user clicks password reset link, set flag to show reset screen
        if (event === "PASSWORD_RECOVERY") {
          console.log("[Password Recovery Detected]");
          setIsPasswordReset(true);
        }
        // For React Native, check if this is initial sign in after app launch
        // If user has no profile yet and was just signed in, it might be from recovery
        if (event === "SIGNED_IN" && !profile) {
          // Check URL for recovery type
          Linking.getInitialURL().then((url) => {
            if (url?.includes("type=recovery")) {
              console.log("[Recovery detected from initial URL on SIGNED_IN]");
              setIsPasswordReset(true);
            }
          });
        }
      }
    );

    // Hide splash after 2 seconds and then finish boot
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      setBootLoading(false);
    }, 2000);

    return () => {
      listener?.subscription.unsubscribe();
      linkingSubscription.remove();
      clearTimeout(splashTimer);
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session) return;

    console.log("[loadProfile] Session user:", session.user.email);
    console.log("[loadProfile] isPasswordReset:", isPasswordReset);

    setProfileLoading(true);
    setStatusMessage(null);
    try {
      const result = await getProfile();
      setProfile(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load profile";
      setStatusMessage(message);
    } finally {
      setProfileLoading(false);
      setBootLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      console.log(
        "[useEffect] Loading profile, isPasswordReset:",
        isPasswordReset
      );
      if (!isPasswordReset) {
        loadProfile();
      }
    } else {
      setProfile(null);
      setBootLoading(false);
    }
  }, [session, loadProfile, isPasswordReset]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setStatusMessage(null);
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setStatusMessage(message);
    } finally {
      setSigningOut(false);
    }
  }, []);

  if (showSplash) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require("./assets/images/Minimal Ledgerly Logo for Fintech App.png")}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.appTagline}>Smart Debt Tracking</Text>
      </SafeAreaView>
    );
  }

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2d8cff" />
        <Text style={styles.centeredText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (session && !profile && !profileLoading && !isPasswordReset) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.centeredText}>Profile not available</Text>
        {statusMessage && <Text style={styles.errorText}>{statusMessage}</Text>}
        <TouchableOpacity style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPending = profile?.status === "PENDING";
  const isRejected = profile?.status === "REJECTED";
  const showApp = session && profile && !isPending && !isRejected;

  if (session && profile && (isPending || isRejected)) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.centeredText}>
          {isPending
            ? "Waiting for admin approval"
            : "Your request was rejected"}
        </Text>
        <Text style={styles.centerSubtext}>
          {isPending
            ? "An admin needs to approve your access to this organization."
            : "Please contact your admin or try joining again."}
        </Text>
        <TouchableOpacity style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={linking}
      fallback={<ActivityIndicator size="large" color="#2d8cff" />}
    >
      <StatusBar style="light" />
      {showApp && !isPasswordReset ? (
        <AppTabNavigator
          profile={profile}
          profileLoading={profileLoading}
          signingOut={signingOut}
          loadProfile={loadProfile}
          handleSignOut={handleSignOut}
        />
      ) : (
        <AuthNavigator isPasswordReset={isPasswordReset} />
      )}

      {statusMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{statusMessage}</Text>
        </View>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: "#0b1d2c",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: "#0b1d2c",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  splashLogo: {
    width: "100%",
    height: "50%",
    marginBottom: 20,
  },
  centeredText: {
    color: "#f2f6fc",
    marginTop: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  appName: {
    color: "#f2f6fc",
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
  appTagline: {
    color: "#9fc5ff",
    fontSize: 16,
    marginTop: -100,
    textAlign: "center",
    fontWeight: "500",
  },
  centerSubtext: {
    color: "#9fc5ff",
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
  },
  errorText: {
    color: "#f47174",
    marginVertical: 8,
    fontWeight: "700",
    textAlign: "center",
  },
  link: {
    color: "#9fc5ff",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#2d8cff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 10,
    minWidth: 140,
    alignItems: "center",
  },
  dangerButton: {
    backgroundColor: "#f47174",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 10,
    minWidth: 140,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  toast: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#1c3a52",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2d8cff",
  },
  toastText: {
    color: "#f2f6fc",
    textAlign: "center",
  },
});
