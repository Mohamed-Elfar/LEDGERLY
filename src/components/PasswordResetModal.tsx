import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import { supabase } from "../../supabaseClient";

type FormValues = {
  newPassword: string;
  confirmPassword: string;
};

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PasswordResetModal({
  visible,
  onClose,
}: PasswordResetModalProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const password = watch("newPassword");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw error;

      Alert.alert("Success", "Password updated successfully");
      reset();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={28}
                color="#2d8cff"
              />
            </View>
            <Text style={styles.title}>Set Your Password</Text>
            <Text style={styles.subtitle}>
              Create a secure password to protect your account
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* New Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color="#9fc5ff"
                  style={styles.inputIcon}
                />
                <Controller
                  name="newPassword"
                  control={control}
                  rules={{
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor="#5a7a92"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      editable={!submitting}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9fc5ff"
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword?.message && (
                <Text style={styles.helper}>{errors.newPassword.message}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color="#9fc5ff"
                  style={styles.inputIcon}
                />
                <Controller
                  name="confirmPassword"
                  control={control}
                  rules={{
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor="#5a7a92"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      editable={!submitting}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#9fc5ff"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword?.message && (
                <Text style={styles.helper}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Skip for Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Set Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#0b1d2c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(45, 140, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f2f6fc",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9fc5ff",
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
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
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#9fc5ff",
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#2d8cff",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2d8cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
