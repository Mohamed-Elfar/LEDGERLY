import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "ConfirmEmail">;

export function EmailConfirmScreen({ navigation, route }: Props) {
  const { email, orgId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name="email-check-outline"
              size={48}
              color="#6bdc93"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            We sent a confirmation link to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text style={styles.body}>
            Please verify your email to finish setting up your account.
          </Text>

          {orgId && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Organization ID:</Text>
              <View style={styles.codeBadge}>
                <MaterialCommunityIcons
                  name="identifier"
                  size={16}
                  color="#2d8cff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.code}>{orgId}</Text>
              </View>
              <Text style={styles.codeSubtitle}>
                Share this with your teammates to join your organization.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.replace("SignIn")}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Back to sign in</Text>
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
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(107, 220, 147, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0f2a40",
    borderWidth: 1.5,
    borderColor: "#1e3d54",
    borderRadius: 16,
    padding: 24,
  },
  title: {
    color: "#f2f6fc",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    color: "#c7d3e0",
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
    textAlign: "center",
  },
  emailHighlight: {
    color: "#9fc5ff",
    fontWeight: "600",
  },
  codeContainer: {
    marginVertical: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "rgba(45, 140, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e3d54",
  },
  codeLabel: {
    color: "#c7d3e0",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  codeBadge: {
    flexDirection: "row",
    backgroundColor: "rgba(45, 140, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2d8cff",
  },
  code: {
    color: "#9fc5ff",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "monospace",
  },
  codeSubtitle: {
    color: "#7a94a8",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#2d8cff",
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    shadowColor: "#2d8cff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
