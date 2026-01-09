import { useState, useRef, useEffect } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { verifyPasswordResetOTP, sendPasswordResetOTP } from "../services/auth";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOTP">;

export function VerifyOTPScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && text) {
      const otpCode = [...newOtp.slice(0, 5), text].join("");
      if (otpCode.length === 6) {
        handleVerifyOTP(otpCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join("");
    
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await verifyPasswordResetOTP(email, code);
      // Navigate to reset password screen with the verified email and OTP code
      navigation.navigate("ResetPassword", { email, otp: code });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid verification code";
      setError(message);
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError(null);
    try {
      await sendPasswordResetOTP(email);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
    } finally {
      setResending(false);
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
              name="shield-lock-outline"
              size={32}
              color="#2d8cff"
            />
          </View>
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
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

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                error ? styles.otpBoxError : null,
              ]}
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!submitting}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={resending || submitting}
          activeOpacity={0.7}
          style={styles.resendButton}
        >
          {resending ? (
            <ActivityIndicator size="small" color="#2d8cff" />
          ) : (
            <Text style={styles.resendText}>Didn't receive code? Resend</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={() => handleVerifyOTP()}
          disabled={submitting || otp.join("").length !== 6}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>
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
  emailHighlight: {
    color: "#2d8cff",
    fontWeight: "600",
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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  otpBox: {
    width: 50,
    height: 56,
    borderWidth: 2,
    borderColor: "#1c3a52",
    borderRadius: 12,
    backgroundColor: "#132536",
    fontSize: 24,
    fontWeight: "700",
    color: "#f2f6fc",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#2d8cff",
    backgroundColor: "rgba(45, 140, 255, 0.1)",
  },
  otpBoxError: {
    borderColor: "#f47174",
  },
  resendButton: {
    alignSelf: "center",
    marginBottom: 32,
    padding: 8,
  },
  resendText: {
    color: "#2d8cff",
    fontSize: 14,
    fontWeight: "600",
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
});
