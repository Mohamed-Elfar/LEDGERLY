import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { AppStackParamList } from "../types/navigation";
import { UserProfile } from "../types/models";
import { formatOrgName } from "../utils/org";
import { getCommonHeaderOptions } from "../utils/commonHeader";

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

  return (
    <AppStack.Navigator
      screenOptions={{
        ...getCommonHeaderOptions({
          orgId: profile.org_id,
          userRole: profile.role,
        }),
        contentStyle: { paddingTop: 16 },
      }}
    >
      <AppStack.Screen
        name="Customers"
        options={{
          title: displayOrgName,
        }}
      >
        {(props) => <CustomersScreen {...props} profile={profile} />}
      </AppStack.Screen>
      <AppStack.Screen
        name="CustomerDetail"
        options={{
          title: "Customer",
        }}
      >
        {(props) => <CustomerDetailScreen {...props} profile={profile} />}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}
