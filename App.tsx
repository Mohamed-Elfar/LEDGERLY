import "react-native-gesture-handler";

import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Auth failed";
        setStatusMessage(message);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, newSession) => {
        setSession(newSession);
        if (!newSession) {
          setProfile(null);
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
      clearTimeout(splashTimer);
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session) return;
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
      loadProfile();
    } else {
      setProfile(null);
      setBootLoading(false);
    }
  }, [session, loadProfile]);

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

  if (session && !profile && !profileLoading) {
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

  const showApp = session && profile;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      {showApp ? (
        <AppTabNavigator
          profile={profile}
          profileLoading={profileLoading}
          signingOut={signingOut}
          loadProfile={loadProfile}
          handleSignOut={handleSignOut}
        />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} />
          <AuthStack.Screen
            name="ConfirmEmail"
            component={EmailConfirmScreen}
          />
        </AuthStack.Navigator>
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
