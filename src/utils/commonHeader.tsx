import { View, StyleSheet } from "react-native";
import { NotificationsBell } from "../components/NotificationsBell";

const headerBackground = () => {
  return (
    <View style={styles.headerBackground}>
      <View style={styles.headerFill} />
    </View>
  );
};

export const getCommonHeaderOptions = (params?: { orgId?: string }) => ({
  headerShown: true,
  headerTitleAlign: "center" as const,
  headerStyle: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleStyle: { color: "#f2f6fc", fontWeight: "700" as const },
  headerTintColor: "#9fc5ff",
  headerBackground,
  headerRight: params?.orgId
    ? () => <NotificationsBell orgId={params.orgId!} />
    : undefined,
});

const styles = StyleSheet.create({
  headerBackground: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerFill: {
    flex: 1,
    backgroundColor: "#0f2a40",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: 1,
    borderColor: "#1c3a52",
  },
});
