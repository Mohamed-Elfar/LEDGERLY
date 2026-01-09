import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getOrgJoinRequests } from "../services/joinRequests";
import { JoinRequest } from "../types/models";

interface Props {
  orgId: string;
}

export function NotificationsBell({ orgId }: Props) {
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const pending = await getOrgJoinRequests(orgId);
      setRequests(pending);
    } catch (err) {
      // Swallow errors in bell; detailed errors appear on Team screen
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchPending();
  };

  const pendingCount = requests.length;
  const showBadge = pendingCount > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={toggle}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name={showBadge ? "bell-ring" : "bell-outline"}
          size={22}
          color="#f2f6fc"
        />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {pendingCount > 9 ? "9+" : pendingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Join requests</Text>
            <Text style={styles.dropdownMeta}>
              {loading
                ? "Loading..."
                : showBadge
                ? `${pendingCount} pending`
                : "No new"}
            </Text>
          </View>

          {loading ? null : !showBadge ? (
            <Text style={styles.emptyText}>No new user notifications</Text>
          ) : (
            requests.slice(0, 4).map((req) => (
              <View key={req.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{req.username || req.email}</Text>
                <Text style={styles.itemSub}>Wants to join your org</Text>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.viewAll}
            onPress={() => {
              setOpen(false);
              navigation.navigate("TeamTab");
            }}
          >
            <Text style={styles.viewAllText}>Open team</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginRight: 8,
  },
  bellButton: {
    padding: 8,
    borderRadius: 20,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#f47174",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 10,
  },
  dropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 200,
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dropdownTitle: {
    color: "#f2f6fc",
    fontWeight: "800",
    fontSize: 14,
  },
  dropdownMeta: {
    color: "#9fc5ff",
    fontSize: 12,
  },
  emptyText: {
    color: "#7a94a8",
    fontStyle: "italic",
    marginVertical: 4,
  },
  itemRow: {
    marginBottom: 8,
  },
  itemName: {
    color: "#f2f6fc",
    fontWeight: "700",
  },
  itemSub: {
    color: "#9fc5ff",
    fontSize: 12,
    marginTop: 2,
  },
  viewAll: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1c3a52",
  },
  viewAllText: {
    color: "#2d8cff",
    fontWeight: "700",
  },
});
