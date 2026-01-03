import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "../../supabaseClient";
import { UserProfile } from "../types/models";
import { formatOrgName } from "../utils/org";

type Props = {
  profile: UserProfile;
};

type TeamMember = {
  id: string;
  username: string;
  role: "ADMIN" | "STAFF";
  org_name?: string;
  org_id: string;
};

export function TeamScreen({ profile }: Props) {
  const displayOrgName = formatOrgName(profile.org_name);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("user_profiles")
      .select("id, username, role, org_name, org_id")
      .eq("org_id", profile.org_id)
      .order("role", { ascending: false })
      .order("username", { ascending: true });

    if (err) {
      setError(err.message);
      setMembers([]);
    } else {
      setMembers(data ?? []);
    }
  }, [profile.org_id]);

  useEffect(() => {
    loadTeam().finally(() => setLoading(false));
  }, [loadTeam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeam();
    setRefreshing(false);
  }, [loadTeam]);

  const renderItem = ({ item }: { item: TeamMember }) => {
    const isAdmin = item.role === "ADMIN";
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberIconWrapper}>
          <MaterialCommunityIcons
            name={isAdmin ? "shield-account" : "account-circle"}
            size={26}
            color={isAdmin ? "#ffd166" : "#9fc5ff"}
          />
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.username || "(no name)"}</Text>
          <View style={styles.memberMetaRow}>
            <View
              style={[
                styles.roleBadge,
                isAdmin ? styles.roleAdmin : styles.roleStaff,
              ]}
            >
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
            <Text style={styles.memberOrg}>
              {formatOrgName(item.org_name) || displayOrgName}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header removed per request */}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2d8cff" />
          <Text style={styles.centeredText}>Loading team...</Text>
        </View>
      ) : (
        <>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {members.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={36}
                color="#9fc5ff"
              />
              <Text style={styles.centeredText}>No team members yet.</Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#2d8cff"
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
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
  header: {
    marginBottom: 16,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9fc5ff",
    fontSize: 14,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centeredText: {
    color: "#c7d3e0",
  },
  errorText: {
    color: "#f47174",
    marginBottom: 12,
    fontWeight: "600",
  },
  memberCard: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    alignItems: "center",
    marginHorizontal: 6,
  },
  memberIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#112d44",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: "#f2f6fc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  memberMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#15314a",
    borderWidth: 1,
    borderColor: "#1e3d54",
  },
  roleAdmin: {
    backgroundColor: "rgba(255, 209, 102, 0.15)",
    borderColor: "#ffd166",
  },
  roleStaff: {
    backgroundColor: "rgba(159, 197, 255, 0.15)",
    borderColor: "#9fc5ff",
  },
  roleText: {
    color: "#f2f6fc",
    fontSize: 12,
    fontWeight: "700",
  },
  memberOrg: {
    color: "#9fc5ff",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 16,
    paddingHorizontal: 6,
  },
  separator: {
    height: 12,
  },
});
