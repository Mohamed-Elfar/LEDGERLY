import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";

import { listCustomers, upsertCustomer } from "../services/customers";
import { supabase } from "../../supabaseClient";
import { Customer, UserProfile } from "../types/models";
import { AppStackParamList } from "../types/navigation";
import { isPhone } from "../utils/validation";

type Props = NativeStackScreenProps<AppStackParamList, "Customers"> & {
  profile: UserProfile;
};

type CustomerForm = {
  fullName: string;
  phone: string;
  address?: string;
  debt?: string;
};

export function CustomersScreen({ navigation, profile }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerForm>({
    defaultValues: { fullName: "", phone: "", address: "", debt: "" },
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const data = await listCustomers(profile.org_id, search.trim());
      setCustomers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  }, [profile.org_id, search]);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  const onSaveCustomer = async (values: CustomerForm) => {
    setSaving(true);
    setGlobalError(null);
    try {
      // Check for duplicates in same org by phone or name
      const phoneTrimmed = values.phone.trim();
      const nameTrimmed = values.fullName.trim();
      const { data: existing, error: dupError } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .eq("org_id", profile.org_id)
        .or(`phone.eq.${phoneTrimmed},full_name.eq.${nameTrimmed}`);

      if (dupError) throw dupError;
      if (existing && existing.length > 0) {
        const phoneExists = existing.some((c) => c.phone === phoneTrimmed);
        const nameExists = existing.some((c) => c.full_name === nameTrimmed);
        if (phoneExists) {
          setError("phone", {
            type: "validate",
            message: "Phone already exists",
          });
        }
        if (nameExists) {
          setError("fullName", {
            type: "validate",
            message: "Name already exists",
          });
        }
        setSaving(false);
        return;
      }

      const customer = await upsertCustomer(
        profile.org_id,
        values.fullName.trim(),
        values.phone.trim(),
        values.address?.trim()
      );

      // If debt is provided, apply it
      if (values.debt && parseFloat(values.debt) > 0) {
        const debt = parseFloat(values.debt);
        await supabase.rpc("apply_debt", {
          p_customer_id: customer.id,
          p_amount: debt,
          p_user_id: profile.id,
          p_user_name: profile.username,
        });
      }

      reset({ fullName: "", phone: "", address: "", debt: "" });
      setShowAddModal(false);
      await loadCustomers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save";
      setGlobalError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Customer }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("CustomerDetail", { customer: item })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.full_name}</Text>
          <Text style={styles.cardBalance}>
            Balance: {item.balance.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.cardPhone}>{item.phone}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.searchInputLarge}
        placeholder="Search by name or phone"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.fullWidthButton, loading && styles.buttonDisabled]}
        onPress={loadCustomers}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Search</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fullWidthButton}
        onPress={() => {
          reset();
          setGlobalError(null);
          setShowAddModal(true);
        }}
      >
        <Text style={styles.buttonText}>Add new customer</Text>
      </TouchableOpacity>

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add new customer</Text>

            {globalError && <Text style={styles.error}>{globalError}</Text>}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full name</Text>
              <Controller
                name="fullName"
                control={control}
                rules={{ required: "Name is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Jane Smith"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.fullName?.message && (
                <Text style={styles.helper}>{errors.fullName.message}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <Controller
                name="phone"
                control={control}
                rules={{
                  required: "Phone is required",
                  validate: (value) => isPhone(value) || "Enter a valid phone",
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="+201001234567"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.phone?.message && (
                <Text style={styles.helper}>{errors.phone.message}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address (optional)</Text>
              <Controller
                name="address"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="123 Main St, Cairo"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Initial debt (optional)</Text>
              <Controller
                name="debt"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSubmit(onSaveCustomer)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save customer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCustomers} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No customers yet. Add one above.</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1d2c",
    padding: 16,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#c7d3e0",
    marginBottom: 12,
  },
  error: {
    color: "#f47174",
    marginBottom: 10,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  searchInputLarge: {
    borderWidth: 1,
    borderColor: "#294156",
    backgroundColor: "#15293b",
    color: "#f2f6fc",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
    marginHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#294156",
    backgroundColor: "#15293b",
    color: "#f2f6fc",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  fullWidthButton: {
    backgroundColor: "#2d8cff",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: "#294156",
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#e5f0ff",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#e5f0ff",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: "#c7d3e0",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#294156",
    backgroundColor: "#15293b",
    color: "#f2f6fc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  helper: {
    color: "#f2c94c",
    marginTop: 6,
  },
  button: {
    backgroundColor: "#2d8cff",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#e5f0ff",
    fontSize: 16,
    fontWeight: "700",
  },
  cardBalance: {
    color: "#9fc5ff",
    fontWeight: "700",
  },
  cardPhone: {
    color: "#c7d3e0",
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  empty: {
    color: "#c7d3e0",
    textAlign: "center",
    marginTop: 20,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: "#0f2a40",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#f2f6fc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: "#294156",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: "#c7d3e0",
    fontWeight: "700",
    fontSize: 16,
  },
});
