import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { EmailConfirmScreen } from "../screens/EmailConfirmScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { SignUpScreen } from "../screens/SignUpScreen";
import { AuthStackParamList } from "../types/navigation";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ConfirmEmail" component={EmailConfirmScreen} />
    </AuthStack.Navigator>
  );
}
