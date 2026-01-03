import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";

import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { AppStackParamList } from "../types/navigation";
import { UserProfile } from "../types/models";
import { formatOrgName } from "../utils/org";

const AppStack = createNativeStackNavigator<AppStackParamList>();

type Props = {
  route: {
    params?: {
      profile?: UserProfile;
    };
  };
};

export function CustomersStackNavigator({ route }: Props) {
  const profile = route.params?.profile;
  if (!profile) {
    return null;
  }

  const displayOrgName = formatOrgName(profile.org_name);

  const headerBackground = () => (
    <View style={styles.headerBackground}>
      <View style={styles.headerFill} />
    </View>
  );

  const headerBaseOptions = {
    headerTitleAlign: "center",
    headerStyle: {
      backgroundColor: "transparent",
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: { color: "#f2f6fc", fontWeight: "700" },
    headerTintColor: "#9fc5ff",
    headerBackground,
  } as const;

  return (
    <AppStack.Navigator
      screenOptions={{
        contentStyle: { paddingTop: 16 },
      }}
    >
      <AppStack.Screen
        name="Customers"
        options={{
          title: displayOrgName,
          ...headerBaseOptions,
        }}
      >
        {(props) => <CustomersScreen {...props} profile={profile} />}
      </AppStack.Screen>
      <AppStack.Screen
        name="CustomerDetail"
        options={{
          title: "Customer",
          ...headerBaseOptions,
        }}
      >
        {(props) => <CustomerDetailScreen {...props} profile={profile} />}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

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
