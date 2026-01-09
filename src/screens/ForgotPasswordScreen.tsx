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

import { sendPasswordResetOTP } from "../services/auth";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

type FormValues = {
  email: string;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      email: "",
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const email = values.email.trim().toLowerCase();
      await sendPasswordResetOTP(email);
      // Navigate to OTP verification screen
      navigation.navigate("VerifyOTP", { email });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
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
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#9fc5ff"
            />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={32}
              color="#2d8cff"
            />
          </View>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a verification code
          </Text>
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

        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
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
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email format",
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#5a7a92"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    editable={!submitting}
                  />
                )}
              />
            </View>
            {errors.email?.message && (
              <Text style={styles.helper}>{errors.email.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send verification code</Text>
            )}
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerSection: {
    marginBottom: 32,
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(45, 140, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f2f6fc",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#9fc5ff",
    textAlign: "center",
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 113, 116, 0.1)",
    borderWidth: 1,
    borderColor: "#f47174",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  error: {
    color: "#f47174",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  formSection: {
    gap: 24,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9fc5ff",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#132536",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1c3a52",
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#f2f6fc",
    fontSize: 15,
  },
  helper: {
    fontSize: 13,
    color: "#f47174",
    marginTop: 4,
  },
  helperInfo: {
    fontSize: 13,
    color: "#9fc5ff",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#2d8cff",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2d8cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(107, 220, 147, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#132536",
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  body: {
    fontSize: 15,
    color: "#9fc5ff",
    lineHeight: 22,
    textAlign: "center",
  },
});
