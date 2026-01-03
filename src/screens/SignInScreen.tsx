import { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { signIn } from "../services/auth";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

type FormValues = {
  email: string;
  password: string;
};

export function SignInScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(values.email.trim(), values.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={32}
              color="#2d8cff"
            />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage customer debts</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={18}
              color="#f47174"
            />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color="#9fc5ff"
                style={styles.inputIcon}
              />
              <Controller
                name="email"
                control={control}
                rules={{ required: "Email is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#5a7a92"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            {errors.email?.message && (
              <Text style={styles.helper}>{errors.email.message}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color="#9fc5ff"
                style={styles.inputIcon}
              />
              <Controller
                name="password"
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#5a7a92"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            {errors.password?.message && (
              <Text style={styles.helper}>{errors.password.message}</Text>
            )}
          </View>
        </View>

        {/* Button Section */}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="login"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Sign in</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>New here?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1d2c",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  headerSection: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#c7d3e0",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#c7d3e0",
    marginBottom: 10,
    fontWeight: "600",
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15293b",
    borderWidth: 1.5,
    borderColor: "#1e3d54",
    borderRadius: 12,
    paddingLeft: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#f2f6fc",
    paddingHorizontal: 8,
    paddingVertical: 14,
    fontSize: 16,
  },
  helper: {
    color: "#ffa500",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 113, 116, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#f47174",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  error: {
    color: "#f47174",
    marginLeft: 10,
    fontWeight: "600",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2d8cff",
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#2d8cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    color: "#9fc5ff",
    fontWeight: "500",
    fontSize: 14,
  },
  linkText: {
    color: "#2d8cff",
    fontWeight: "700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
