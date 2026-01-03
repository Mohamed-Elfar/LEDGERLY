import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "../../supabaseClient";
import { Transaction, UserProfile } from "../types/models";

type Props = {
  profile: UserProfile;
};

type TransactionWithCustomer = Transaction & {
  customer_name?: string;
};

type SectionData = {
  title: string;
  data: TransactionWithCustomer[];
};

type YearTotal = {
  year: string;
  debt: number;
  payment: number;
  net: number;
};

export function HistoryScreen({ profile }: Props) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearlyTotals, setYearlyTotals] = useState<YearTotal[]>([]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all transactions for the organization
      const { data: txs, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      const transactions = (txs as Transaction[]) || [];

      // Compute yearly totals (debt adds, payment subtracts)
      const totalsMap = new Map<string, { debt: number; payment: number }>();
      transactions.forEach((tx) => {
        const year = new Date(tx.created_at).getFullYear().toString();
        if (!totalsMap.has(year)) {
          totalsMap.set(year, { debt: 0, payment: 0 });
        }
        const entry = totalsMap.get(year)!;
        if (tx.tx_type === "DEBT") {
          entry.debt += tx.amount;
        } else if (tx.tx_type === "PAYMENT") {
          entry.payment += tx.amount;
        }
      });

      const totalsArr: YearTotal[] = Array.from(totalsMap.entries())
        .map(([year, { debt, payment }]) => ({
          year,
          debt,
          payment,
          net: debt - payment,
        }))
        .sort((a, b) => Number(b.year) - Number(a.year));

      // Fetch customer names for all transactions
      const customerIds = [
        ...new Set(transactions.map((tx) => tx.customer_id)),
      ];
      const { data: customers, error: custError } = await supabase
        .from("customers")
        .select("id, full_name")
        .in("id", customerIds);

      if (custError) throw custError;

      const customerMap = new Map(
        (customers || []).map((c) => [c.id, c.full_name])
      );

      // Add customer names to transactions
      const txsWithCustomer: TransactionWithCustomer[] = transactions.map(
        (tx) => ({
          ...tx,
          customer_name: customerMap.get(tx.customer_id) || "Unknown",
        })
      );

      // Group by date
      const grouped = new Map<string, TransactionWithCustomer[]>();
      txsWithCustomer.forEach((tx) => {
        const date = new Date(tx.created_at);
        const dateKey = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(tx);
      });

      // Convert to sections
      const sectionData: SectionData[] = Array.from(grouped.entries()).map(
        ([date, data]) => ({
          title: date,
          data,
        })
      );

      setSections(sectionData);
      setYearlyTotals(totalsArr);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [profile.org_id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name="calendar-today"
        size={16}
        color="#9fc5ff"
        style={{ marginRight: 8 }}
      />
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: TransactionWithCustomer }) => {
    const isDebt = item.tx_type === "DEBT";
    const time = new Date(item.created_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.iconCircle,
              isDebt ? styles.iconCircleDebt : styles.iconCirclePayment,
            ]}
          >
            <MaterialCommunityIcons
              name={isDebt ? "arrow-up" : "arrow-down"}
              size={18}
              color={isDebt ? "#f47174" : "#4ecdc4"}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.transactionMeta}>
              {time} · {item.user_name}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.amount,
              isDebt ? styles.amountDebt : styles.amountPayment,
            ]}
          >
            {isDebt ? "+" : "-"}
            {item.amount.toFixed(2)}
          </Text>
          <View
            style={[
              styles.typeBadge,
              isDebt ? styles.typeBadgeDebt : styles.typeBadgePayment,
            ]}
          >
            <Text
              style={[
                styles.typeText,
                isDebt ? styles.typeTextDebt : styles.typeTextPayment,
              ]}
            >
              {isDebt ? "DEBT" : "PAYMENT"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2d8cff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {yearlyTotals.length > 0 && (
        <View style={styles.totalsContainer}>
          {yearlyTotals.map((t) => {
            const isPositive = t.net >= 0;
            return (
              <View key={t.year} style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalYear}>{t.year}</Text>
                  <Text
                    style={[
                      styles.totalNet,
                      isPositive ? styles.netDebt : styles.netPayment,
                    ]}
                  >
                    {isPositive ? "+" : "-"}
                    {Math.abs(t.net).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Debts</Text>
                  <Text style={styles.totalValue}>{t.debt.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Payments</Text>
                  <Text style={styles.totalValue}>{t.payment.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={64} color="#5a7a92" />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadHistory}
              tintColor="#2d8cff"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1d2c",
    paddingTop: 28,
  },
  list: {
    padding: 16,
  },
  totalsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  totalCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalYear: {
    color: "#f2f6fc",
    fontWeight: "800",
    fontSize: 15,
  },
  totalLabel: {
    color: "#9fc5ff",
    fontWeight: "600",
    fontSize: 13,
  },
  totalValue: {
    color: "#f2f6fc",
    fontWeight: "700",
    fontSize: 14,
  },
  totalNet: {
    fontWeight: "800",
    fontSize: 15,
  },
  netDebt: {
    color: "#f47174",
  },
  netPayment: {
    color: "#4ecdc4",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f2a40",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#9fc5ff",
    fontSize: 14,
    fontWeight: "700",
  },
  transactionCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconCircleDebt: {
    backgroundColor: "rgba(244, 113, 116, 0.15)",
  },
  iconCirclePayment: {
    backgroundColor: "rgba(78, 205, 196, 0.15)",
  },
  transactionInfo: {
    flex: 1,
  },
  customerName: {
    color: "#f2f6fc",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  transactionMeta: {
    color: "#9fc5ff",
    fontSize: 12,
    fontWeight: "600",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  amountDebt: {
    color: "#f47174",
  },
  amountPayment: {
    color: "#4ecdc4",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeDebt: {
    backgroundColor: "rgba(244, 113, 116, 0.15)",
  },
  typeBadgePayment: {
    backgroundColor: "rgba(78, 205, 196, 0.15)",
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  typeTextDebt: {
    color: "#f47174",
  },
  typeTextPayment: {
    color: "#4ecdc4",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 113, 116, 0.15)",
    borderLeftWidth: 3,
    borderLeftColor: "#f47174",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  errorText: {
    color: "#f47174",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: "#9fc5ff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
});
