import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "../../supabaseClient";
import { JoinRequest, UserProfile } from "../types/models";
import { formatOrgName } from "../utils/org";
import {
  approveJoinRequest,
  getOrgJoinRequests,
  rejectJoinRequest,
} from "../services/joinRequests";

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
  const navigation = useNavigation<any>();
  const displayOrgName = formatOrgName(profile.org_name);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  );

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

  const loadJoinRequests = useCallback(async () => {
    try {
      console.log(
        "[TeamScreen] Loading join requests for org:",
        profile.org_id
      );
      setRequestsLoading(true);
      setError(null);
      const pending = await getOrgJoinRequests(profile.org_id);
      console.log("[TeamScreen] Loaded join requests:", pending);
      setJoinRequests(pending);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load requests";
      console.error("[TeamScreen] Error loading join requests:", err);
      setError(errorMsg);
      setJoinRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [profile.org_id]);

  useFocusEffect(
    useCallback(() => {
      console.log("[TeamScreen] Tab focused - loading data");
      loadTeam().finally(() => setLoading(false));
      loadJoinRequests();
    }, [loadTeam, loadJoinRequests])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeam();
    await loadJoinRequests();
    setRefreshing(false);
  }, [loadTeam, loadJoinRequests]);

  useLayoutEffect(() => {
    const pendingCount = joinRequests.length;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBell}
          onPress={loadJoinRequests}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={pendingCount ? "bell-ring" : "bell-outline"}
            size={22}
            color="#f2f6fc"
          />
          {pendingCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {pendingCount > 9 ? "9+" : pendingCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, joinRequests, loadJoinRequests]);

  const handleApprove = useCallback(async (request: JoinRequest) => {
    setProcessingRequestId(request.id);
    try {
      await approveJoinRequest(request);
      setJoinRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  const handleReject = useCallback(async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await rejectJoinRequest(requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  const renderItem = ({ item }: { item: TeamMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberIconWrapper}>
        <MaterialCommunityIcons name="account" size={24} color="#2d8cff" />
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.username}</Text>
        <View style={styles.memberMetaRow}>
          <View
            style={[
              styles.roleBadge,
              item.role === "ADMIN" ? styles.roleAdmin : styles.roleStaff,
            ]}
          >
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          {item.org_name && (
            <Text style={styles.memberOrg}>{formatOrgName(item.org_name)}</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {joinRequests.length > 0 && (
        <View style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={18}
                color="#9fc5ff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.pendingTitle}>Join requests</Text>
            </View>
            {requestsLoading ? (
              <ActivityIndicator size="small" color="#2d8cff" />
            ) : (
              <Text
                style={styles.pendingCount}
              >{`${joinRequests.length} pending`}</Text>
            )}
          </View>

          {joinRequests.map((req) => {
            const isProcessing = processingRequestId === req.id;
            return (
              <View key={req.id} style={styles.requestRow}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>
                    {req.username || req.email}
                  </Text>
                  <Text style={styles.requestEmail}>{req.email}</Text>
                  <Text style={styles.requestMetaText}>
                    Wants to join {displayOrgName}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[
                      styles.approveButton,
                      isProcessing && styles.buttonDim,
                    ]}
                    onPress={() => handleApprove(req)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.requestActionText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.rejectButton,
                      isProcessing && styles.buttonDim,
                    ]}
                    onPress={() => handleReject(req.id)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.requestActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
  pendingCard: {
    backgroundColor: "#0f2a40",
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pendingTitle: {
    color: "#f2f6fc",
    fontWeight: "700",
    fontSize: 15,
  },
  pendingCount: {
    color: "#9fc5ff",
    fontWeight: "600",
    fontSize: 12,
  },
  pendingEmpty: {
    color: "#7a94a8",
    fontStyle: "italic",
  },
  requestRow: {
    borderWidth: 1,
    borderColor: "#1c3a52",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#0b2437",
  },
  requestInfo: {
    marginBottom: 10,
  },
  requestName: {
    color: "#f2f6fc",
    fontWeight: "800",
    fontSize: 15,
  },
  requestEmail: {
    color: "#9fc5ff",
    fontSize: 13,
    marginTop: 2,
  },
  requestMetaText: {
    color: "#7a94a8",
    marginTop: 6,
    fontSize: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#2d8cff",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#f47174",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  requestActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  buttonDim: {
    opacity: 0.6,
  },
  headerBell: {
    marginRight: 10,
    padding: 6,
    borderRadius: 20,
  },
  headerBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#f47174",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  headerBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 10,
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
