import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { signUp } from "../services/auth";
import { Role } from "../types/models";
import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

type FormValues = {
  email: string;
  password: string;
  orgName: string;
  username: string;
  joinOrgId?: string;
};

export function SignUpScreen({ navigation }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
      orgName: "",
      username: "",
      joinOrgId: "",
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<Role>("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [isJoiningOrg, setIsJoiningOrg] = useState(false);

  const joinOrgId = watch("joinOrgId");

  const slugify = useMemo(
    () => (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    []
  );

  const generateOrgId = useMemo(() => {
    return (name: string) => {
      const base = slugify(name) || "org";
      const suffix = Math.random().toString(36).slice(2, 6);
      return `${base}-${suffix}`;
    };
  }, [slugify]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const finalOrgId =
        isJoiningOrg && values.joinOrgId
          ? values.joinOrgId.trim().toLowerCase()
          : generateOrgId(values.orgName);

      const orgName = isJoiningOrg ? values.joinOrgId : values.orgName.trim();

      await signUp(
        values.email.trim(),
        values.password,
        finalOrgId,
        orgName,
        values.username.trim(),
        role
      );
      navigation.replace("ConfirmEmail", {
        email: values.email.trim(),
        orgId: finalOrgId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
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
              name="account-plus-outline"
              size={32}
              color="#2d8cff"
            />
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Set up your organization profile</Text>
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
          {/* Toggle: Create New or Join Existing Org */}
          <View style={styles.toggleSection}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !isJoiningOrg && styles.toggleButtonActive,
              ]}
              onPress={() => setIsJoiningOrg(false)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={18}
                color={!isJoiningOrg ? "#fff" : "#9fc5ff"}
              />
              <Text
                style={[
                  styles.toggleText,
                  !isJoiningOrg && styles.toggleTextActive,
                ]}
              >
                Create New
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                isJoiningOrg && styles.toggleButtonActive,
              ]}
              onPress={() => setIsJoiningOrg(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="login"
                size={18}
                color={isJoiningOrg ? "#fff" : "#9fc5ff"}
              />
              <Text
                style={[
                  styles.toggleText,
                  isJoiningOrg && styles.toggleTextActive,
                ]}
              >
                Join Existing
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create New Organization */}
          {!isJoiningOrg && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Organization name</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={20}
                  color="#9fc5ff"
                  style={styles.inputIcon}
                />
                <Controller
                  name="orgName"
                  control={control}
                  rules={{
                    required: "Organization name is required",
                    validate: (value) =>
                      isJoiningOrg ||
                      value.trim().length > 0 ||
                      "Organization name is required",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Full Care Pharmacy"
                      placeholderTextColor="#5a7a92"
                      autoCapitalize="words"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
              {errors.orgName?.message && (
                <Text style={styles.helper}>{errors.orgName.message}</Text>
              )}
            </View>
          )}

          {/* Join Existing Organization */}
          {isJoiningOrg && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Organization ID</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="identifier"
                  size={20}
                  color="#9fc5ff"
                  style={styles.inputIcon}
                />
                <Controller
                  name="joinOrgId"
                  control={control}
                  rules={{
                    required: "Organization ID is required",
                    validate: (value) =>
                      !isJoiningOrg ||
                      (value && value.trim().length > 0) ||
                      "Organization ID is required",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="fullcare-ioxw"
                      placeholderTextColor="#5a7a92"
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
              <Text style={styles.helperInfo}>
                Ask your organization admin for the ID
              </Text>
              {errors.joinOrgId?.message && (
                <Text style={styles.helper}>{errors.joinOrgId.message}</Text>
              )}
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color="#9fc5ff"
                style={styles.inputIcon}
              />
              <Controller
                name="username"
                control={control}
                rules={{ required: "Username is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="store-owner"
                    placeholderTextColor="#5a7a92"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            {errors.username?.message && (
              <Text style={styles.helper}>{errors.username.message}</Text>
            )}
          </View>

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
                rules={{
                  required: "Password is required",
                  minLength: { value: 6, message: "Use at least 6 characters" },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password (6+ characters)"
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

          {/* Role selection - Only show when creating new org */}
          {!isJoiningOrg && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {(["ADMIN", "STAFF"] as Role[]).map((item) => {
                  const active = item === role;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                      onPress={() => setRole(item)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={
                          item === "ADMIN"
                            ? "shield-account-outline"
                            : "account-outline"
                        }
                        size={16}
                        color={active ? "#fff" : "#c7d3e0"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={active ? styles.roleTextActive : styles.roleText}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
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
                name="account-plus"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Create account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.replace("SignIn")}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Sign in</Text>
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
    marginBottom: 30,
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
    marginBottom: 20,
  },
  toggleSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#15293b",
    borderWidth: 1.5,
    borderColor: "#1e3d54",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#2d8cff",
    borderColor: "#2d8cff",
  },
  toggleText: {
    color: "#9fc5ff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },
  toggleTextActive: {
    color: "#fff",
  },
  formGroup: {
    marginBottom: 18,
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
  helperInfo: {
    color: "#9fc5ff",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "400",
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
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#1e3d54",
    backgroundColor: "#15293b",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChipActive: {
    backgroundColor: "#2d8cff",
    borderColor: "#2d8cff",
  },
  roleText: {
    color: "#c7d3e0",
    fontWeight: "600",
    fontSize: 14,
  },
  roleTextActive: {
    color: "#fff",
    fontWeight: "700",
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
