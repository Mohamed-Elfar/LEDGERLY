import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";

import { addDebt, getHistory, recordPayment } from "../services/transactions";
import { supabase } from "../../supabaseClient";
import { Customer, Transaction, UserProfile } from "../types/models";
import { AppStackParamList } from "../types/navigation";
import { isPositive } from "../utils/validation";

type Props = NativeStackScreenProps<AppStackParamList, "CustomerDetail"> & {
  profile: UserProfile;
};

type AmountForm = {
  amount: string;
};

export function CustomerDetailScreen({ route, profile }: Props) {
  const [customer, setCustomer] = useState<Customer>(route.params.customer);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busyAction, setBusyAction] = useState<"DEBT" | "PAYMENT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control: debtControl,
    handleSubmit: handleDebtSubmit,
    reset: resetDebt,
    formState: { errors: debtErrors },
  } = useForm<AmountForm>({ defaultValues: { amount: "" } });

  const {
    control: payControl,
    handleSubmit: handlePaySubmit,
    reset: resetPay,
    formState: { errors: payErrors },
  } = useForm<AmountForm>({ defaultValues: { amount: "" } });

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const data = await getHistory(profile.org_id, customer.id);
      setHistory(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      setError(message);
    } finally {
      setLoadingHistory(false);
    }
  }, [customer.id, profile.org_id]);

  const loadCustomer = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customer.id)
        .single();
      if (error) throw error;
      setCustomer(data as Customer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reload";
      setError(message);
    }
  }, [customer.id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // Calculate balance from transaction history
  const calculateBalance = () => {
    return history.reduce((sum, tx) => {
      if (tx.tx_type === "DEBT") {
        return sum + tx.amount;
      } else if (tx.tx_type === "PAYMENT") {
        return sum - Math.abs(tx.amount);
      }
      return sum;
    }, 0);
  };

  const displayBalance =
    history.length > 0 ? calculateBalance() : customer.balance;

  const applyDebt = async (values: AmountForm) => {
    const amount = Number(values.amount);
    if (!isPositive(amount)) {
      setError("Enter a positive amount");
      return;
    }
    setBusyAction("DEBT");
    setError(null);
    try {
      const tx = await addDebt(
        profile.org_id,
        customer.id,
        amount,
        profile.id,
        profile.username
      );
      setHistory((prev) => [tx, ...prev]);
      await loadCustomer();
      resetDebt({ amount: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add debt";
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  const applyPayment = async (values: AmountForm) => {
    const amount = Number(values.amount);
    if (!isPositive(amount)) {
      setError("Enter a positive amount");
      return;
    }
    setBusyAction("PAYMENT");
    setError(null);
    try {
      const tx = await recordPayment(
        profile.org_id,
        customer.id,
        amount,
        profile.id,
        profile.username
      );
      setHistory((prev) => [tx, ...prev]);
      await loadCustomer();
      resetPay({ amount: "" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record payment";
      setError(message);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{customer.full_name}</Text>
        {customer.address && (
          <Text style={styles.subtitle}>{customer.address}</Text>
        )}
        <Text style={styles.subtitle}>{customer.phone}</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Text style={styles.balanceValue}>{displayBalance.toFixed(2)}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.row}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Add debt</Text>
            <Controller
              name="amount"
              control={debtControl}
              rules={{
                required: "Amount is required",
                validate: (value) => {
                  const amount = Number(value);
                  if (!Number.isFinite(amount)) return "Enter a valid number";
                  if (amount <= 0) return "Amount must be positive";
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {debtErrors.amount?.message && (
              <Text style={styles.error}>{debtErrors.amount.message}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, busyAction && styles.buttonDisabled]}
              onPress={handleDebtSubmit(applyDebt)}
              disabled={busyAction !== null}
            >
              {busyAction === "DEBT" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add debt</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Record payment</Text>
            <Controller
              name="amount"
              control={payControl}
              rules={{
                required: "Amount is required",
                validate: (value) => {
                  const amount = Number(value);
                  if (!Number.isFinite(amount)) return "Enter a valid number";
                  if (amount <= 0) return "Amount must be positive";
                  if (amount > displayBalance)
                    return "Payment cannot exceed current debt";
                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {payErrors.amount?.message && (
              <Text style={styles.error}>{payErrors.amount.message}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, busyAction && styles.buttonDisabled]}
              onPress={handlePaySubmit(applyPayment)}
              disabled={busyAction !== null}
            >
              {busyAction === "PAYMENT" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Record payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Transaction history</Text>
            <TouchableOpacity onPress={loadHistory} disabled={loadingHistory}>
              {loadingHistory ? (
                <ActivityIndicator color="#9fc5ff" />
              ) : (
                <Text style={styles.refreshText}>Refresh</Text>
              )}
            </TouchableOpacity>
          </View>

          {loadingHistory ? (
            <ActivityIndicator color="#9fc5ff" style={{ marginVertical: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.empty}>No transactions yet.</Text>
          ) : (
            history.map((tx) => (
              <View key={tx.id} style={styles.historyRow}>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>
                    {tx.tx_type === "DEBT" ? "Debt added" : "Payment"}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(tx.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyUser}>{tx.user_name}</Text>
                  <Text
                    style={
                      tx.tx_type === "DEBT"
                        ? styles.historyAmountDebt
                        : styles.historyAmountPay
                    }
                  >
                    {tx.tx_type === "DEBT" ? "+" : "-"}
                    {tx.amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
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
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#c7d3e0",
    marginBottom: 12,
  },
  balanceCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  balanceLabel: {
    color: "#c7d3e0",
    marginBottom: 4,
  },
  balanceValue: {
    color: "#e5f0ff",
    fontSize: 22,
    fontWeight: "700",
  },
  error: {
    color: "#f47174",
    marginBottom: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  formCard: {
    flex: 1,
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    color: "#e5f0ff",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#294156",
    backgroundColor: "#15293b",
    color: "#f2f6fc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
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
  historyCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  refreshText: {
    color: "#9fc5ff",
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1c3a52",
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    color: "#e5f0ff",
    fontWeight: "700",
  },
  historyDate: {
    color: "#c7d3e0",
    marginTop: 2,
    fontSize: 12,
  },
  historyRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  historyUser: {
    color: "#9fc5ff",
    fontSize: 12,
    marginBottom: 4,
  },
  historyMeta: {
    color: "#c7d3e0",
    marginTop: 2,
  },
  historyAmountDebt: {
    color: "#f47174",
    fontWeight: "700",
  },
  historyAmountPay: {
    color: "#6bdc93",
    fontWeight: "700",
  },
  empty: {
    color: "#c7d3e0",
    textAlign: "center",
    marginTop: 8,
  },
});
