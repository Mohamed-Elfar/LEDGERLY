import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { EmailConfirmScreen } from "../screens/EmailConfirmScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { SignUpScreen } from "../screens/SignUpScreen";
import { AuthStackParamList } from "../types/navigation";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  isPasswordReset?: boolean;
};

export function AuthNavigator({ isPasswordReset }: Props) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {isPasswordReset ? (
        <AuthStack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
        />
      ) : (
        <>
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} />
          <AuthStack.Screen
            name="ConfirmEmail"
            component={EmailConfirmScreen}
          />
          <AuthStack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <AuthStack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
        </>
      )}
    </AuthStack.Navigator>
  );
}
