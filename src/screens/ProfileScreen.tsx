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
  Modal,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "../../supabaseClient";
import { UserProfile } from "../types/models";
import { formatOrgName } from "../utils/org";

type Props = {
  profile: UserProfile;
  refreshing: boolean;
  signingOut: boolean;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

type EditForm = {
  username: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ProfileScreen({
  profile,
  refreshing,
  signingOut,
  onRefresh,
  onSignOut,
}: Props) {
  const displayOrgName = formatOrgName(profile.org_name);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditForm>({
    defaultValues: {
      username: profile.username,
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  const onSave = async (values: EditForm) => {
    setSaving(true);
    setError(null);
    try {
      // Update username if changed
      if (values.username.trim() !== profile.username) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({ username: values.username.trim() })
          .eq("id", profile.id);
        if (profileError) throw profileError;
      }

      // Update password if provided
      if (values.oldPassword && values.newPassword) {
        // Verify old password by signing in
        const { data: user } = await supabase.auth.getUser();
        if (!user.user?.email) throw new Error("No email found");

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.user.email,
          password: values.oldPassword,
        });
        if (signInError) throw new Error("Old password is incorrect");

        // Update to new password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: values.newPassword,
        });
        if (passwordError) throw passwordError;
      }

      setShowEditModal(false);
      reset({
        username: values.username,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = profile.role === "ADMIN";

  const handleDeleteOrg = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      const email = user.user?.email;
      if (!email) throw new Error("No email found for verification");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: deletePassword,
      });
      if (signInError) throw new Error("Password is incorrect");

      const { error: txDeleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("org_id", profile.org_id);
      if (txDeleteError) throw txDeleteError;

      const { error: customersDeleteError } = await supabase
        .from("customers")
        .delete()
        .eq("org_id", profile.org_id);
      if (customersDeleteError) throw customersDeleteError;

      const { error: profilesDeleteError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("org_id", profile.org_id);
      if (profilesDeleteError) throw profilesDeleteError;

      setShowDeleteModal(false);
      setDeletePassword("");
      await onSignOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.pillBadgePrimary}>
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={14}
              color="#fff"
              style={styles.badgeIcon}
            />
            <Text style={styles.badgeText}>{displayOrgName}</Text>
          </View>
          <View style={isAdmin ? styles.pillBadgeAdmin : styles.pillBadgeStaff}>
            <MaterialCommunityIcons
              name={isAdmin ? "shield-outline" : "account-outline"}
              size={14}
              color={isAdmin ? "#0b1d2c" : "#0b1d2c"}
              style={styles.badgeIcon}
            />
            <Text style={isAdmin ? styles.badgeTextDark : styles.badgeTextDark}>
              {profile.role}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{profile.username}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Organization ID</Text>
          <Text style={styles.value}>{profile.org_id}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          reset({
            username: profile.username,
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          setError(null);
          setShowEditModal(true);
        }}
      >
        <MaterialCommunityIcons
          name="account-edit-outline"
          size={18}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.buttonText}>Edit profile</Text>
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity
          style={[styles.dangerButton, { marginBottom: 12 }]}
          onPress={() => {
            setDeletePassword("");
            setDeleteError(null);
            setShowDeleteModal(true);
          }}
        >
          <Text style={styles.buttonText}>Delete organization</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.dangerButton, signingOut && styles.buttonDisabled]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign out</Text>
        )}
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color="#f47174"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <Controller
                name="username"
                control={control}
                rules={{ required: "Username is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    placeholderTextColor="#5a7a92"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                  />
                )}
              />
              {errors.username?.message && (
                <Text style={styles.helper}>{errors.username.message}</Text>
              )}
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Change Password (Optional)</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Old Password</Text>
              <Controller
                name="oldPassword"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter old password"
                    placeholderTextColor="#5a7a92"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <Controller
                name="newPassword"
                control={control}
                rules={{
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
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.newPassword?.message && (
                <Text style={styles.helper}>{errors.newPassword.message}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <Controller
                name="confirmPassword"
                control={control}
                rules={{
                  validate: (value) =>
                    !newPassword ||
                    value === newPassword ||
                    "Passwords do not match",
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#5a7a92"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.confirmPassword?.message && (
                <Text style={styles.helper}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSubmit(onSave)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEditModal(false)}
              disabled={saving}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Organization</Text>
            <Text style={styles.deleteWarning}>
              This will remove the organization, all customers, transactions,
              and user profiles. This action cannot be undone.
            </Text>

            {deleteError && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color="#f47174"
                />
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm with password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#5a7a92"
                secureTextEntry
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                importantForAutofill="no"
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.dangerButton, deleting && styles.buttonDisabled]}
              onPress={handleDeleteOrg}
              disabled={deleting || !deletePassword}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirm delete</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1d2c",
    padding: 16,
    paddingTop: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#112d44",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9fc5ff",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    marginHorizontal: 6,
    gap: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#1c3a52",
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#9fc5ff",
    fontWeight: "600",
    fontSize: 14,
  },
  value: {
    color: "#e5f0ff",
    fontSize: 15,
    fontWeight: "700",
  },
  pillBadgePrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(45, 140, 255, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2d8cff",
  },
  pillBadgeAdmin: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffd166",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e6b84f",
  },
  pillBadgeStaff: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#9fc5ff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7aacef",
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    color: "#f2f6fc",
    fontWeight: "700",
    fontSize: 13,
  },
  badgeTextDark: {
    color: "#0b1d2c",
    fontWeight: "700",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2d8cff",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  dangerButton: {
    backgroundColor: "#f47174",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    paddingBottom: 24,
  },
  modalContent: {
    backgroundColor: "#0f2a40",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#112d44",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#f2f6fc",
    fontWeight: "600",
  },
  helper: {
    color: "#f47174",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "rgba(244, 113, 116, 0.15)",
    borderLeftWidth: 3,
    borderLeftColor: "#f47174",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalTitle: {
    color: "#f2f6fc",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#9fc5ff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  deleteWarning: {
    color: "#f47174",
    marginBottom: 12,
    fontWeight: "700",
  },
  modalCloseButton: {
    backgroundColor: "#1c3a52",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 8,
  },
  modalCloseText: {
    color: "#9fc5ff",
    fontWeight: "700",
    fontSize: 16,
  },
});
