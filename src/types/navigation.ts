import { Customer } from "./models";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ConfirmEmail: { email: string; orgId?: string };
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string; otp: string };
};

export type AppStackParamList = {
  Customers: undefined;
  CustomerDetail: { customer: Customer };
  Profile: undefined;
};
